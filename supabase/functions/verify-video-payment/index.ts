// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import Stripe from "https://esm.sh/stripe@11.12.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { video_order_id, video_session_id } = await req.json();

    if (!video_order_id && !video_session_id) {
      throw new Error("video_order_id oswa video_session_id oblije.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with video details
    let query = supabase.from("videos_ai_orders").select("*, videos_ai(title, category, video_url)");
    if (video_order_id) {
      query = query.eq("id", video_order_id);
    } else if (video_session_id) {
      query = query.eq("stripe_session_id", video_session_id);
    }

    const { data: order, error: oErr } = await query.maybeSingle();

    if (oErr || !order) {
      return new Response(JSON.stringify({ paid: false, message: "Lòd sa pa jwenn nan baz de done a." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1. If already marked as paid by Webhook or previous verification
    if (order.payment_status === "paye" || order.payment_status === "completed") {
      return new Response(JSON.stringify({
        paid: true,
        user_email: order.user_email,
        title: order.videos_ai?.title || "Vidéo AI",
        video_url: order.videos_ai?.video_url || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. If Stripe session ID exists, verify directly with Stripe API
    const stripeSessionId = order.stripe_session_id || video_session_id;
    if (stripeSessionId) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

        if (session && session.payment_status === "paid") {
          // Update database status to paid
          await supabase
            .from("videos_ai_orders")
            .update({ payment_status: "paye" })
            .eq("id", order.id);

          // Trigger video delivery email
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-video-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ video_order_id: order.id }),
          }).catch(console.error);

          return new Response(JSON.stringify({
            paid: true,
            user_email: order.user_email,
            title: order.videos_ai?.title || "Vidéo AI",
            video_url: order.videos_ai?.video_url || null
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    // 3. Payment not finalized
    return new Response(JSON.stringify({
      paid: false,
      user_email: order.user_email,
      message: "Peman an poko konfime nan sistèm lan."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ paid: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
