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
    const { service_id, prenom, non, email, telephone, message, mode_paiement, horaires, gateway, rabais, qty_months = 1, timezone_offset, timezone_name } = await req.json();

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

    // --- DOUBLE BOOKING PREVENTION ---
    // 1. Fetch all reservations that are PAID and NOT EXPIRED
    const paidStatuses = ['payé', 'paye', 'paid', 'confirme', 'confirmé', 'atribue', 'atribué', 'termine', 'terminé', 'complete', 'complète'];
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingRez, error: rezErr } = await supabase
      .from("reservations")
      .select("horaires, valide_juska")
      .in("statut", paidStatuses)
      .or(`valide_juska.gte.${today},valide_juska.is.null`);

    if (rezErr) console.warn("[Checkout] Error fetching existing rez:", rezErr);

    // 2. Map all taken slots (Normalize key to DX_HY to prevent multi-service overlaps)
    const takenSlots = new Set();
    (existingRez || []).forEach((r: any) => {
        if (!r.horaires) return;
        Object.entries(r.horaires).forEach(([key, slots]: [string, any]) => {
            const dayPart = key.split('_').pop(); // extracts "D0", "D1", etc.
            if (Array.isArray(slots) && dayPart) {
                slots.forEach(s => takenSlots.add(`${dayPart}_${s}`));
            }
        });
    });

    // 3. Verify if new request conflicts with taken slots
    if (horaires) {
        let conflict = false;
        Object.entries(horaires).forEach(([key, slots]: [string, any]) => {
            const dayPart = key.split('_').pop();
            if (Array.isArray(slots) && dayPart) {
                slots.forEach(s => {
                    if (takenSlots.has(`${dayPart}_${s}`)) conflict = true;
                });
            }
        });

        if (conflict) {
            throw new Error("Eskize nou, youn nan lè ou chwazi yo sot rezève pa yon lòt moun (oswa li ekspire pandan w t ap chwazi a). Tanpri chwazi yon lòt lè.");
        }
    }

    // Calculate initial price based on quantity of months
    const basePrice = service.prix * qty_months;
    let amount = basePrice;
    if (mode_paiement === 'depot') amount = amount / 2;
    if (mode_paiement === '3x') amount = amount / 3;

    // Apply Discount if present (rabais is percentage)
    if (rabais && rabais > 0) {
      console.log(`[Checkout] Appliquan rabè ${rabais}%`);
      amount = amount - (amount * (rabais / 100));
    }

    // Calculate Validity Date (valide_juska)
    // Default = 30 days per month
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + (qty_months * 30));
    const valide_juska = validityDate.toISOString().split('T')[0];

    // Create reservation in DB
    const insertPayload: any = {
        prenom,
        nom: non,
        email,
        telephone,
        message,
        mode_paiement,
        montant_total: amount,
        horaires,
        statut: 'en_attente',
        service_ids: [service_id],
        valide_juska: valide_juska,
        timezone_offset,
        timezone_name
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
