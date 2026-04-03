import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: 'public' } }
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY pa konfigire.");

    // 1. Jwenn rezèvasyon ki an atant ki gen yon URL pèman
    // Nou pran sa ki fèt depi plis pase 15 minit (pou evite voye pandan kliyan an ap peye an dirèk)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: pendingRez, error: fetchErr } = await supabase
      .from("reservations")
      .select("*, services(nom)")
      .eq("statut", "en_attente")
      .not("checkout_url", "is", null)
      .lt("created_at", fifteenMinsAgo)
      .limit(20); // Batch de 20 pour éviter les timeouts

    if (fetchErr) throw fetchErr;

    const results = [];

    for (const res of (pendingRez || [])) {
      const now = Date.now();
      const lastReminder = res.last_reminder_at ? new Date(res.last_reminder_at).getTime() : 0;
      const hoursSinceLast = (now - lastReminder) / (1000 * 60 * 60);

      // Kondisyon: 
      // - Si se premye fwa (reminder_count = 0)
      // - OSWA si dènye fwa a depase 5 èdtan
      if (res.reminder_count === 0 || hoursSinceLast >= 5) {
        
        const serviceName = res.services?.nom || "sèvis nou an";
        const checkoutUrl = res.checkout_url;
        
        // ── MAIL CONTENT (Kreyòl) ──────────────────────────────────────────
        const subject = res.reminder_count === 0 
            ? `🚀 Finalize rezèvasyon w lan — DJ Innovations` 
            : `🔔 Pa bliye — Sèvis ${serviceName} w lan ap tann ou!`;

        const html = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; color: #333;">
            <div style="background: linear-gradient(135deg, #BA7517 0%, #8E5E14 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">DJ Innovations</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Platfòm Freelance Premium ou an</p>
            </div>
            
            <div style="padding: 40px 30px; line-height: 1.6;">
              <h2 style="color: #BA7517; font-size: 22px; margin-top: 0;">Bonjou ${res.prenom},</h2>
              
              <p style="font-size: 16px;">Nou wè w te kòmanse rezève sèvis <strong>${serviceName}</strong> an, men ou pa t gen chans finalize pèman an.</p>
              
              <p style="font-size: 16px; background: #fff8e1; border-left: 4px solid #BA7517; padding: 15px; border-radius: 4px; margin: 25px 0;">
                <strong>Siksè ou pa ka tann!</strong> Konpetisyon an ap mache vit, e nou ta renmen ede w domine mache a ak sèvis pwofesyonèl nou yo.
              </p>
              
              <p style="font-size: 16px;">Klike sou bouton anba a pou w retounen kote w te ye a epi finalize rezèvasyon w lan nan mwens pase 2 minit :</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${checkoutUrl}" style="background-color: #BA7517; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 12px rgba(186, 117, 23, 0.3);">
                  Konfime Rezèvasyon m lan kounye a →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">Si bouton an pa mache, ou ka kopye lyen sa a nan navigatè w :<br>
              <a href="${checkoutUrl}" style="color: #BA7517; word-break: break-all;">${checkoutUrl}</a></p>
              
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="font-size: 16px;">Si w gen nenpòt difikilte ak pèman an oswa si w gen kesyon, pa ezite reponn imèl sa a. Ekip nou an la pou ede w!</p>
              
              <p style="font-size: 16px; margin-bottom: 0;">N ap tann ou pou n kòmanse travay ansanm,</p>
              <p style="font-size: 16px; font-weight: bold; color: #BA7517; margin-top: 5px;">Ekip DJ Innovations</p>
            </div>
            
            <div style="background: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #888;">
              <p style="margin: 0;">© ${new Date().getFullYear()} DJ Innovations. Tout dwa rezève.</p>
              <p style="margin: 5px 0 0;">Ou resevwa imèl sa a paske w te kòmanse yon rezèvasyon sou sit nou an.</p>
            </div>
          </div>
        `;

        // 2. Voye imèl la via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
            to: res.email,
            subject: subject,
            html: html,
          }),
        });

        if (emailRes.ok) {
          // 3. Mete ajou rezèvasyon an
          await supabase
            .from("reservations")
            .update({
              last_reminder_at: new Date().toISOString(),
              reminder_count: (res.reminder_count || 0) + 1
            })
            .eq("id", res.id);
          
          results.push({ id: res.id, status: "sent", count: (res.reminder_count || 0) + 1 });
        } else {
          const err = await emailRes.json();
          results.push({ id: res.id, status: "error", error: err });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
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
