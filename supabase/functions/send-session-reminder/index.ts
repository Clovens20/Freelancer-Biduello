import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reservation_id } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get current time & day
    // Freelancer/Base Timezone: GMT-4 (Dominican Republic)
    const now = new Date();
    // Offset to AST (GMT-4)
    const astNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Santo_Domingo" }));

    const dayNames = ['Dimanch', 'Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi'];
    const currentDayName = dayNames[astNow.getDay()];
    const currentHour = astNow.getHours();
    const currentMinutes = astNow.getMinutes();

    console.log(`[Reminder] Checking for: ${currentDayName} @ ${currentHour}:${currentMinutes}`);

    // 1.5 Fetch Landing Config for Meeting Link
    const { data: config } = await supabase.from('landing_config').select('coaching_meeting_url').eq('id', 1).single();
    const meetingUrl = config?.coaching_meeting_url || "https://meet.google.com/";

    // 2. Fetch PAID & ACTIVE reservations (or specific ID for testing)
    const todayStr = astNow.toISOString().split('T')[0];
    const paidStatuses = ['payé', 'paye', 'paid', 'confirme', 'confirmé', 'atribue', 'atribué', 'termine', 'terminé', 'complete', 'complète'];

    let query = supabase.from("reservations").select("*");
    if (reservation_id) {
      query = query.eq("id", reservation_id);
    } else {
      query = query.in("statut", paidStatuses).or(`valide_juska.gte.${todayStr},valide_juska.is.null`);
    }

    const { data: reservations, error } = await query;

    if (error) throw error;

    const remindersSent = [];

    for (const res of (reservations || [])) {
      if (!res.horaires) continue;

      // Check each slot in horaires
      for (const [key, slots] of Object.entries(res.horaires)) {
        if (!Array.isArray(slots)) continue;

        const dayMatch = key.match(/D(\d+)$/);
        if (!dayMatch) continue;

        const dayIdx = parseInt(dayMatch[1]);
        const appDayIdx = astNow.getDay() === 0 ? 6 : astNow.getDay() - 1;

        // Skip day check if manual test
        if (!reservation_id && dayIdx !== appDayIdx) continue;

        for (const slot of slots) {
          const slotHour = parseInt(slot.replace('H', ''));

          const timeToSlot = (slotHour * 60) - (currentHour * 60 + currentMinutes);

          // If manual test, or within 20 mins of slot startTime
          if (reservation_id || (timeToSlot > 0 && timeToSlot <= 20)) {
            console.log(`[Reminder] Triggering for ${res.email} - Slot ${slot}`);

            // 3. Fetch Freelancer Email for this reservation
            const { data: svc } = await supabase.from('services').select('freelancers(email)').in('id', res.service_ids || []).single();
            const freelancerEmail = svc?.freelancers?.email;

            const resendKey = Deno.env.get("RESEND_API_KEY");
            if (!resendKey) throw new Error("RESEND_API_KEY pa konfigire nan Edge Function.");

            const recipients = [res.email];
            if (freelancerEmail && freelancerEmail !== res.email) {
              recipients.push(freelancerEmail);
            }

            console.log(`[Reminder] Sending email to: ${recipients.join(', ')}`);
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendKey}`
              },
              body: JSON.stringify({
                from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
                to: recipients,
                subject: "🔔 Rapèl : Sesyon Coaching ou a ap kòmanse nan 15 minit!",
                html: `
                    <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee; border-radius:10px;">
                      <h2 style="color:#BA7517;">Prepare w, ${res.prenom}!</h2>
                      <p>Sesyon coaching la planifye pou jodi a <strong>ap rive</strong> nan <strong>15 minit</strong>.</p>
                      <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin:20px 0;">
                        <p style="margin:0;">📅 <strong>Jodi a</strong></p>
                        <p style="margin:5px 0 0 0;">⏰ <strong>${slotHour}:00</strong> (Orè Sen Domeng)</p>
                      </div>
                      <p><strong>Detay Randevou:</strong></p>
                      <ul>
                        <li>Kliyan: ${res.prenom} ${res.nom}</li>
                        <li>Imèl: ${res.email}</li>
                      </ul>
                      <div style="text-align:center; margin:30px 0;">
                        <a href="${meetingUrl}" target="_blank" style="background-color:#BA7517; color:white; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block; font-size:1rem; box-shadow:0 4px 6px rgba(186,117,23,0.15)">🤝 Konekte nan Sesyon an Kounye a</a>
                      </div>
                      <br>
                      <p style="font-size:0.8rem; color:#888;">N ap swete nou yon bèl sesyon!</p>
                      <hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
                      <p style="text-align:center; color:#BA7517; font-weight:bold;">DJ Innovations Portal</p>
                    </div>
                  `
              })
            });

            if (!emailRes.ok) {
              const errBody = await emailRes.text();
              console.error("[Reminder] Resend Error:", emailRes.status, errBody);
              throw new Error(`Resend Error: ${emailRes.status} - ${errBody}`);
            }

            console.log("[Reminder] Email sent successfully!");
            remindersSent.push(res.email);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: reservations?.length, sent: remindersSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
