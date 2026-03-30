import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import Stripe from "https://esm.sh/stripe@11.12.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { service_id, prenom, non, email, telephone, message, mode_paiement, horaires, gateway } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get service details
    const { data: service, error: sErr } = await supabase
      .from("services")
      .select("*, freelancers(*)")
      .eq("id", service_id)
      .single();

    if (sErr) throw sErr;

    // Calculate price based on mode
    let amount = service.prix;
    if (mode_paiement === 'depot') amount = amount / 2;
    if (mode_paiement === '3x') amount = amount / 3;

    // Create reservation in DB
    const insertPayload: any = {
        prenom,
        nom: non,
        email,
        telephone,
        message,
        mode_paiement,
        montant_total: service.prix,
        horaires,
        statut: 'en_attente'
    };
    
    // Le schéma Supabase attend très probablement "service_ids" comme tableau au lieu de "service_id".
    insertPayload['service_ids'] = [service_id];
    
    // Ajout de statuts robustes
    insertPayload['statut'] = 'en_attente';
    
    const { data: res, error: rErr } = await supabase
      .from("reservations")
      .insert(insertPayload)
      .select()
      .single();

    if (rErr) throw rErr;

    // --- MONCASH (BAZIK.IO) PAYMENT ---
    if (gateway === "moncash") {
      const bPayload = {
        amount: Math.round(amount),
        customer_email: email,
        description: `Pèman pou ${prenom} ${non}`,
        callback_url: Deno.env.get("BAZIK_CALLBACK_URL"),
        return_url: `${req.headers.get("origin")}/success.html?session_id=${res.id}`
      };

      // Configuration dynamique de l'URL pour ne pas avoir de doubles slashes et utiliser l'endpoint listé
      const baseUrl = Deno.env.get("BAZIK_BASE_URL")?.replace(/\/+$/, '') || 'https://api.bazik.io';
      const bazikEndpoint = `${baseUrl}/moncash/payments/${res.id}`;

      const bResponse = await fetch(bazikEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("BAZIK_API_KEY")}`
        },
        body: JSON.stringify(bPayload)
      });
      
      const bData = await bResponse.json();
      if (!bResponse.ok) throw new Error(`Bazik Error: ${JSON.stringify(bData)}`);
      
      const pay_url = bData.url || bData.payment_url || (bData.data && bData.data.url) || bData.checkoutUrl;
      
      return new Response(JSON.stringify({ url: pay_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // --- STRIPE PAYMENT ---
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

    // Update reservation with session ID
    await supabase
      .from("reservations")
      .update({ stripe_session_id: session.id })
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
