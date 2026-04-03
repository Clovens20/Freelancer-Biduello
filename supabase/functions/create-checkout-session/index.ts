import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import Stripe from "https://esm.sh/stripe@11.12.0?target=deno";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { service_id, prenom, non, email, telephone, message, mode_paiement, horaires, gateway, rabais } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: 'public' } }
    );

    // Get service details
    const { data: service, error: sErr } = await supabase
      .from("services")
      .select("*, freelancers(*)")
      .eq("id", service_id)
      .single();

    if (sErr) throw sErr;

    // Calculate initial price based on mode
    let amount = service.prix;
    if (mode_paiement === 'depot') amount = amount / 2;
    if (mode_paiement === '3x') amount = amount / 3;

    // Apply Discount if present (rabais is percentage)
    if (rabais && rabais > 0) {
      console.log(`[Checkout] Appliquan rabè ${rabais}%`);
      amount = amount - (amount * (rabais / 100));
    }

    // Create reservation in DB
    const insertPayload: any = {
        prenom,
        nom: non,
        email,
        telephone,
        message,
        mode_paiement,
        montant_total: amount, // ✅ Sèvi ak pri ak rabè a
        horaires,
        statut: 'en_attente',
        service_ids: [service_id],
    };
    
    const { data: res, error: rErr } = await supabase
      .from("reservations")
      .insert(insertPayload)
      .select()
      .single();

    if (rErr) throw rErr;

    // --- MONCASH (BAZIK.IO) PAYMENT ---
    if (gateway === "moncash") {
      const bazikUserId = Deno.env.get("BAZIK_USER_ID");
      const bazikSecret = Deno.env.get("BAZIK_API_KEY");
      const baseUrl = Deno.env.get("BAZIK_BASE_URL")?.replace(/\/+$/, '') || 'https://api.bazik.io';

      // 1. Obtenir le jeton (Token) d'authentification
      const authRes = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: bazikUserId, secretKey: bazikSecret })
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(`Bazik Auth Error: ${JSON.stringify(authData)}`);

      // Le montant est originellement en cents (USD), on le remet en USD puis on convertit en Gourdes (ex: taux 135)
      const tauxConversionHTG = 135;
      const amountGdes = Math.round((amount / 100) * tauxConversionHTG);

      // 2. Créer le paiement MonCash
      const bPayload = {
        gdes: amountGdes,
        referenceId: res.id,
        customerFirstName: prenom,
        customerLastName: non,
        customerEmail: email,
        description: `Pèman pou ${prenom} ${non}`,
        webhookUrl: Deno.env.get("BAZIK_CALLBACK_URL"),
        successUrl: `${req.headers.get("origin")}/success.html?session_id=${res.id}`,
        errorUrl: `${req.headers.get("origin")}/`
      };

      const bResponse = await fetch(`${baseUrl}/moncash/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authData.token || authData.data?.token}`
        },
        body: JSON.stringify(bPayload)
      });
      
      const bData = await bResponse.json();
      if (!bResponse.ok) throw new Error(`Bazik Payment Error: ${JSON.stringify(bData)}`);
      
      // L'URL de redirection correcte retournée par l'API de paiement Bazik (selon le SDK Node)
      const pay_url = bData.redirectUrl || bData.url || (bData.data && bData.data.redirectUrl);
      
      // Update reservation with checkout URL
      await supabase
        .from("reservations")
        .update({ checkout_url: pay_url })
        .eq("id", res.id);
      
      return new Response(JSON.stringify({ url: pay_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- STRIPE PAYMENT ---
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${service.nom} - ${mode_paiement}`,
              description: `Pèman pou ${prenom} ${non}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/index.html`,
      customer_email: email,
      metadata: {
        reservation_id: res.id,
        service_id: service_id,
      },
    });

    // Update reservation with session ID and checkout URL
    await supabase
      .from("reservations")
      .update({ 
        stripe_session_id: session.id,
        checkout_url: session.url 
      })
      .eq("id", res.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const errorDetails = err?.message || JSON.stringify(err);
    // On retourne 200 temporairement pour gruger le SDK et pouvoir lire le vrai message d'erreur dans 'data.error' au lieu du message générique "non-2xx".
    return new Response(JSON.stringify({ error: errorDetails, traceback: err }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
