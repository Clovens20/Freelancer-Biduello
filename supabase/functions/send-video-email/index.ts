// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { video_order_id } = body;

    if (!video_order_id) throw new Error("video_order_id oblije.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch order details
    const { data: order, error: oErr } = await supabase
      .from("videos_ai_orders")
      .select("*, videos_ai(*)")
      .eq("id", video_order_id)
      .single();

    if (oErr || !order) {
      throw new Error("Lòd sa pa ekziste nan baz de done a.");
    }

    const video = order.videos_ai;
    if (!video) throw new Error("Videyo sa pa asosye ak lòd la kòrèkteman.");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY pa konfigire nan Edge Function.");

    console.log(`[send-video-email] Sending email via Resend to ${order.user_email}...`);

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
        to: [order.user_email],
        subject: `Videyo AI ou a: ${video.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:25px;border-radius:12px;">
            <h2 style="color:#BA7517;">DJ Innovations - Vidéo AI</h2>
            <p>Mèsi anpil pou acha w fè a!</p>
            <p>Ou fèk achte videyo: <strong>${video.title}</strong> nan kategori <strong>${video.category}</strong>.</p>
            <p>Men lyen sekirize ou pou w wè epi telechaje videyo a:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${video.video_url}" style="background-color: #BA7517; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Telechaje Videyo a</a>
            </div>
            <p>Si bouton an pa mache, ou ka kopye lyen sa a nan navigatè w la:</p>
            <p><a href="${video.video_url}">${video.video_url}</a></p>
            <hr style="border:0;border-top:1px solid #eee;margin:30px 0 20px;">
            <p style="font-size:12px;color:#888;">© ${new Date().getFullYear()} DJ Innovations. Siksè ou se priyorite nou.</p>
          </div>
        `
      }),
    });

    if (!emailResp.ok) {
        const emailErr = await emailResp.text();
        throw new Error(`Erè nan voye imèl: ${emailErr}`);
    }

    // Mark as sent
    await supabase
      .from("videos_ai_orders")
      .update({ download_link_sent: true })
      .eq("id", video_order_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
