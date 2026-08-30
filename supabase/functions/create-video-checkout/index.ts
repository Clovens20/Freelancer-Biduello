// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import Stripe from "https://esm.sh/stripe@11.12.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, video_id, gateway = 'stripe' } = await req.json();

    if (!email || !video_id) {
      throw new Error("Imèl ak ID videyo oblije.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: 'public' } }
    );

    // Get video details
    const { data: video, error: vErr } = await supabase
      .from("videos_ai")
      .select("*")
      .eq("id", video_id)
      .single();

    if (vErr || !video) {
      throw new Error("Videyo sa pa ekziste nan baz de done a.");
    }

    // Insert order in 'videos_ai_orders'
    const { data: order, error: oErr } = await supabase
      .from("videos_ai_orders")
      .insert({
        user_email: email,
        video_id: video_id,
        amount_paid: video.price,
        payment_status: 'en_attente'
      })
      .select()
      .single();

    if (oErr) throw oErr;

    // --- MONCASH (BAZIK.IO) PAYMENT ---
    if (gateway === "moncash") {
      const bazikUserId = Deno.env.get("BAZIK_USER_ID");
      const bazikSecret = Deno.env.get("BAZIK_API_KEY");
      const baseUrl = Deno.env.get("BAZIK_BASE_URL")?.replace(/\/+$/, '') || 'https://api.bazik.io';

      // 1. Get Bazik Auth Token
      const authRes = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: bazikUserId, secretKey: bazikSecret })
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(`Bazik Auth Error: ${JSON.stringify(authData)}`);

      // Convert USD to Gourdes HTG (e.g. 1 USD = 135 HTG)
      const amountGdes = Math.round(video.price * 135);

      // 2. Create MonCash payment token
      const bPayload = {
        gdes: amountGdes,
        referenceId: order.id,
        customerFirstName: "Kliyan",
        customerLastName: "Vidéo AI",
        customerEmail: email,
        description: `Acha Vidéo AI: ${video.title}`,
        webhookUrl: Deno.env.get("BAZIK_CALLBACK_URL"),
        successUrl: `${req.headers.get("origin")}/success.html?video_order_id=${order.id}`,
        errorUrl: `${req.headers.get("origin")}/videos-ai.html`
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
      
      const pay_url = bData.redirectUrl || bData.url || (bData.data && bData.data.redirectUrl);
      
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
              name: `Acha Vidéo AI: ${video.title}`,
              description: video.category,
            },
            unit_amount: Math.round(video.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/success.html?video_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/videos-ai.html`,
      customer_email: email,
      metadata: {
        video_order_id: order.id,
      },
    });

    // Update order with session id
    await supabase
      .from("videos_ai_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
