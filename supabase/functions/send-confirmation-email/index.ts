import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

serve(async (req) => {
  try {
    const { reservation_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch reservation, service and freelancer details
    const { data: res, error } = await supabase
      .from("reservations")
      .select("*, services(*), freelancers(*)")
      .eq("id", reservation_id)
      .single();

    if (error) throw error;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FORMATEUR_EMAIL = Deno.env.get("FORMATEUR_EMAIL");

    const slotsHtml = (res.horaires || []).map(h => `<li>${h.date} à ${h.time}</li>`).join('');

    // Send email to Customer (Fakti Elektwonik)
    const customerEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DJ Innovations <info@djinnovations.com>",
        to: res.email,
        subject: `Fakti Elektwonik - ${res.services.nom} — DJ Innovations`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #BA7517;">DJ Innovations</h2>
            <hr>
            <h1>Mèsi pou konfyans ou, ${res.prenom}!</h1>
            <p>Peman ou pou sèvis <strong>${res.services.nom}</strong> an byen pase. Sa se fakti elektwonik ou.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Freelancer ou:</strong> ${res.freelancers?.nom || 'DJ Innovations'}</p>
                <p><strong>Imèl Freelancer:</strong> ${res.freelancers?.email || 'info@djinnovations.com'}</p>
                <p><strong>Sèvis:</strong> ${res.services.nom}</p>
                <p><strong>Pri peye kounye a:</strong> $${res.montant_total} USD</p>
            </div>

            <p><strong>Orè ou chwazi yo:</strong></p>
            <ul>
              ${slotsHtml || '<li>Orè a pral konfime pa freelancer an.</li>'}
            </ul>

            <p>Freelancer w lan ap kontakte w nan <strong>24 a 48 èdtan</strong> pou kòmanse.</p>
            <hr>
            <p style="font-size: 12px; color: #888;">© 2024 DJ Innovations. Tout dwa rezève.</p>
          </div>
        `,
      }),
    });

    // Send email to Freelancer (Notification)
    const freelancerEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DJ Innovations <info@djinnovations.com>",
        to: res.freelancers?.email || FORMATEUR_EMAIL,
        subject: "Nouvo Peman Resevwa! — DJ Innovations",
        html: `
          <h1>Ou gen yon nouvo rezèvasyon, ${res.freelancers?.nom}!</h1>
          <p>Kliyan <strong>${res.prenom} ${res.non}</strong> fenk peye pou sèvis <strong>${res.services.nom}</strong>.</p>
          <hr>
          <p><strong>Detay kliyan:</strong></p>
          <ul>
            <li>Imèl: ${res.email}</li>
            <li>Telefòn: ${res.telephone || 'Okenn'}</li>
            <li>Mesaj: ${res.message || 'Okenn'}</li>
          </ul>
          <p><strong>Orè chwazi:</strong></p>
          <ul>
            ${slotsHtml || '<li>A konfime</li>'}
          </ul>
          <p>Tanpri kontakte kliyan an nan <strong>24 a 48 èdtan</strong>.</p>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
