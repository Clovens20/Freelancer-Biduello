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
    const { service_id, prenom, non, email, telephone, message, mode_paiement, horaires } = await req.json();

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
    const { data: res, error: rErr } = await supabase
      .from("reservations")
      .insert({
        service_id,
        freelancer_id: service.freelancer_id,
        prenom,
        non,
        email,
        telephone,
        message,
        mode_paiement,
        montant_total: service.prix,
        horaires,
        statut: 'en_attente'
      })
      .select()
      .single();

    if (rErr) throw rErr;

    // Create Stripe Session
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
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
