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
    let meetingUrl = "https://meet.google.com/";
    try {
      const { data: config } = await supabase.from('landing_config').select('coaching_meeting_url').eq('id', 1).maybeSingle();
      if (config?.coaching_meeting_url) {
        meetingUrl = config.coaching_meeting_url;
      }
    } catch (e) {
      console.error("[Reminder] Error fetching meeting URL:", e);
    }

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

      let targetSlot = null;
      const appDayIdx = astNow.getDay() === 0 ? 6 : astNow.getDay() - 1;

      console.log(`[Reminder] Processing rez: ${res.email} (Status: ${res.statut})`);

      // 2. Find a matching slot
      for (const [key, slots] of Object.entries(res.horaires)) {
        if (!Array.isArray(slots)) continue;

        const isManualFormat = key === "antant_manuel";
        const appMatch = key.match(/D(\d+)$/);
        
        if (!isManualFormat && !appMatch) {
          console.log(`[Reminder] Skipping key: ${key}`);
          continue;
        }

        const dayIdxFromKey = appMatch ? parseInt(appMatch[1]) : -1;

        for (const slot of slots) {
          let slotHour: number;
          let slotDayIdx: number;

          if (isManualFormat) {
            // format: "D0_H10"
            const m = String(slot).match(/^D(\d+)_H(\d+)$/);
            if (!m) continue;
            slotDayIdx = parseInt(m[1]);
            slotHour = parseInt(m[2]);
          } else {
            // format: "H10", day index is in key (e.g. someService_D0)
            const m = String(slot).match(/^H(\d+)$/);
            if (!m) continue;
            slotDayIdx = dayIdxFromKey;
            slotHour = parseInt(m[1]);
          }

          if (reservation_id) {
            // MANUAL TRIGGER: We want to send a reminder NOW.
            // Pick the first slot we find, preferably for today if it exists.
            if (!targetSlot || slotDayIdx === appDayIdx) {
              targetSlot = { hour: slotHour, day: slotDayIdx };
              if (slotDayIdx === appDayIdx) break; 
            }
          } else {
             // AUTO TRIGGER (CRON): Must be today and within 20 mins.
             if (slotDayIdx === appDayIdx) {
               const timeToSlot = (slotHour * 60) - (currentHour * 60 + currentMinutes);
               if (timeToSlot > 0 && timeToSlot <= 20) {
                 targetSlot = { hour: slotHour, day: slotDayIdx };
                 break;
               }
             }
          }
        }
        if (targetSlot && (reservation_id || targetSlot.day === appDayIdx)) break;
      }

      if (targetSlot) {
        const slotHour = targetSlot.hour;
        console.log(`[Reminder] Triggering for ${res.email} - Slot H${slotHour} (Day ${targetSlot.day})`);

        // 3. Fetch Freelancer Email
        let freelancerEmail = null;
        try {
          const { data: svc, error: svcErr } = await supabase
            .from('services')
            .select('freelancers(email)')
            .in('id', res.service_ids || [])
            .maybeSingle();
            
          if (!svcErr && svc?.freelancers) {
            freelancerEmail = svc.freelancers.email;
          }
        } catch (e) {
          console.error("[Reminder] Error fetching freelancer email:", e);
        }

        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY pa konfigire.");

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
                    <li>Kliyan: ${res.prenom} ${res.nom || ''}</li>
                    <li>Sèvis: Coaching Sesyon</li>
                    <li>Lyen Reyinyon: <a href="${meetingUrl}">${meetingUrl}</a></li>
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

        if (emailRes.ok) {
          console.log("[Reminder] Email sent successfully!");
          remindersSent.push(res.email);
        } else {
          const errBody = await emailRes.text();
          console.error("[Reminder] Resend Error:", emailRes.status, errBody);
        }
      } else {
        console.log(`[Reminder] No matching slot found for ${res.email}`);
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
