import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_GOLD = rgb(0.729, 0.459, 0.090); // #BA7517
const COLOR_DARK = rgb(0.13, 0.13, 0.13);
const COLOR_GRAY = rgb(0.55, 0.55, 0.55);
const COLOR_LGRAY = rgb(0.96, 0.96, 0.96);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_LINE = rgb(0.88, 0.88, 0.88);

// ─── PDF Generator ────────────────────────────────────────────────────────────
async function generateInvoicePDF(params: {
  reservationId: string;
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string | null;
  serviceName: string;
  freelancerNom: string;
  freelancerEmail: string;
  montantTotal: number;
  horaires: { date: string; time: string }[];
  logoUrl: string | null;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in points
  const W = 595.28;
  const H = 841.89;
  const page = pdfDoc.addPage([W, H]);

  // Fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Optional logo ────────────────────────────────────────────────────────────
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (params.logoUrl) {
    try {
      const logoResp = await fetch(params.logoUrl);
      if (logoResp.ok) {
        const logoBytes = await logoResp.arrayBuffer();
        const ct = logoResp.headers.get("content-type") ?? "";
        if (ct.includes("png")) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (ct.includes("jpeg") || ct.includes("jpg")) {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
      }
    } catch (_) {
      // logo optional — skip on error
    }
  }

  // ── Helper: drawText shorthand ────────────────────────────────────────────
  const draw = (
    text: string,
    x: number,
    y: number,
    opts: {
      font?: typeof fontBold | typeof fontRegular;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) => {
    page.drawText(text, {
      x,
      y,
      font: opts.font ?? fontRegular,
      size: opts.size ?? 10,
      color: opts.color ?? COLOR_DARK,
    });
  };

  // ── Helper: rect ─────────────────────────────────────────────────────────
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: ReturnType<typeof rgb>
  ) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
  };

  // ── Helper: horizontal line ───────────────────────────────────────────────
  const hline = (y: number, x1 = 40, x2 = W - 40) => {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness: 0.5,
      color: COLOR_LINE,
    });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // HEADER BAND
  // ════════════════════════════════════════════════════════════════════════════
  rect(0, H - 90, W, 90, COLOR_GOLD);

  if (logoImage) {
    const logoDims = logoImage.scale(0.18);
    page.drawImage(logoImage, {
      x: 40,
      y: H - 80,
      width: logoDims.width,
      height: logoDims.height,
    });
  } else {
    draw("DJ Innovations", 40, H - 48, { font: fontBold, size: 22, color: COLOR_WHITE });
    draw("Plateforme Freelance", 40, H - 66, { size: 9, color: COLOR_WHITE });
  }

  // FACTURE label (right side)
  draw("FACTURE", W - 160, H - 40, { font: fontBold, size: 26, color: COLOR_WHITE });
  const invoiceRef = `#${params.reservationId.slice(0, 8).toUpperCase()}`;
  draw(invoiceRef, W - 160, H - 60, { font: fontBold, size: 11, color: COLOR_WHITE });
  draw(new Date().toLocaleDateString("fr-FR"), W - 160, H - 74, { size: 9, color: COLOR_WHITE });

  // ════════════════════════════════════════════════════════════════════════════
  // SENDER / RECEIVER BLOCK
  // ════════════════════════════════════════════════════════════════════════════
  let y = H - 115;

  // Left: emetteur
  draw("Emetteur", 40, y, { font: fontBold, size: 9, color: COLOR_GRAY });
  y -= 16;
  draw("DJ Innovations", 40, y, { font: fontBold, size: 11 });
  y -= 14;
  draw("noreply@freelancer.konektegroup.com", 40, y, { size: 9, color: COLOR_GRAY });
  y -= 12;
  draw("djinnovations.com", 40, y, { size: 9, color: COLOR_GRAY });

  // Right: destinataire
  let yR = H - 115;
  draw("Facture a", W / 2 + 20, yR, { font: fontBold, size: 9, color: COLOR_GRAY });
  yR -= 16;
  draw(`${params.clientPrenom} ${params.clientNom}`, W / 2 + 20, yR, { font: fontBold, size: 11 });
  yR -= 14;
  draw(params.clientEmail, W / 2 + 20, yR, { size: 9, color: COLOR_GRAY });
  if (params.clientTelephone) {
    yR -= 12;
    draw(params.clientTelephone, W / 2 + 20, yR, { size: 9, color: COLOR_GRAY });
  }

  // ── Separator ─────────────────────────────────────────────────────────────
  y = Math.min(y, yR) - 20;
  hline(y);

  // ════════════════════════════════════════════════════════════════════════════
  // DETAILS TABLE
  // ════════════════════════════════════════════════════════════════════════════
  y -= 20;

  // Table header background
  rect(40, y - 6, W - 80, 22, COLOR_GOLD);
  draw("Description", 52, y + 3, { font: fontBold, size: 9, color: COLOR_WHITE });
  draw("Freelancer", 260, y + 3, { font: fontBold, size: 9, color: COLOR_WHITE });
  draw("Montant (USD)", W - 140, y + 3, { font: fontBold, size: 9, color: COLOR_WHITE });

  y -= 24;

  // Table row 1 — service
  rect(40, y - 6, W - 80, 22, COLOR_LGRAY);
  draw(params.serviceName, 52, y + 3, { size: 9 });
  draw(params.freelancerNom, 260, y + 3, { size: 9 });
  draw(`$${params.montantTotal.toFixed(2)}`, W - 140, y + 3, { font: fontBold, size: 9 });

  y -= 30;
  hline(y);

  // ── Total ─────────────────────────────────────────────────────────────────
  y -= 16;
  draw("Sous-total", W - 220, y, { size: 9, color: COLOR_GRAY });
  draw(`$${params.montantTotal.toFixed(2)} USD`, W - 140, y, { size: 9 });
  y -= 14;
  draw("Taxes", W - 220, y, { size: 9, color: COLOR_GRAY });
  draw("Incluses", W - 140, y, { size: 9, color: COLOR_GRAY });
  y -= 5;
  hline(y, W - 230, W - 40);
  y -= 18;

  // TOTAL box
  rect(W - 230, y - 8, 190, 26, COLOR_GOLD);
  draw("TOTAL PAYE", W - 220, y + 3, { font: fontBold, size: 10, color: COLOR_WHITE });
  draw(`$${params.montantTotal.toFixed(2)} USD`, W - 120, y + 3, { font: fontBold, size: 11, color: COLOR_WHITE });

  // ════════════════════════════════════════════════════════════════════════════
  // SCHEDULE / HORAIRES
  // ════════════════════════════════════════════════════════════════════════════
  y -= 40;
  hline(y + 10);
  draw("Creneaux horaires selectionnes", 40, y - 8, { font: fontBold, size: 10 });
  y -= 24;

  if (params.horaires.length > 0) {
    for (const slot of params.horaires) {
      draw(`-  ${slot.date}   a   ${slot.time}`, 52, y, { size: 9 });
      y -= 16;
    }
  } else {
    draw(
      "Aucun creneau selectionne - le freelancer vous contactera dans 24-48h.",
      52, y,
      { size: 9, color: COLOR_GRAY }
    );
    y -= 16;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FREELANCER CONTACT
  // ════════════════════════════════════════════════════════════════════════════
  y -= 20;
  hline(y + 6);
  y -= 16;
  draw("Votre freelancer", 40, y, { font: fontBold, size: 10 });
  y -= 16;
  draw(`Nom :`, 52, y, { size: 9, color: COLOR_GRAY });
  draw(params.freelancerNom, 110, y, { size: 9 });
  y -= 14;
  draw(`Courriel :`, 52, y, { size: 9, color: COLOR_GRAY });
  draw(params.freelancerEmail, 110, y, { size: 9 });

  // ════════════════════════════════════════════════════════════════════════════
  // STATUT PAIEMENT BADGE
  // ════════════════════════════════════════════════════════════════════════════
  y -= 40;
  rect(40, y - 6, 130, 22, rgb(0.18, 0.64, 0.44));
  draw("[PAYE] PAIEMENT CONFIRME", 52, y + 3, { font: fontBold, size: 9, color: COLOR_WHITE });

  // ════════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════════════════════
  rect(0, 0, W, 40, COLOR_LGRAY);
  hline(40);
  const year = new Date().getFullYear();
  draw(
    `(c) ${year} DJ Innovations - Tous droits reserves   |   noreply@freelancer.konektegroup.com`,
    40, 14,
    { size: 8, color: COLOR_GRAY }
  );
  draw(`Réf. ${params.reservationId}`, W - 180, 14, { size: 8, color: COLOR_GRAY });

  return await pdfDoc.save();
}

// ─── Uint8Array → base64 (safe for Deno) ─────────────────────────────────────
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { reservation_id, force } = await req.json();

    if (!reservation_id) {
      return new Response(
        JSON.stringify({ error: "reservation_id manke nan demann nan." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If force=true (manual resend from dashboard), update statut to 'paye' first
    if (force) {
      await supabase
        .from("reservations")
        .update({ statut: "paye" })
        .eq("id", reservation_id);
    }

    // Fetch the reservation
    const { data: res, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .single();

    if (error) throw new Error(`Erè Supabase: ${error.message}`);
    if (!res) throw new Error("Rezèvasyon pa jwenn.");

    // Check payment status (bypass if force=true)
    if (!force) {
      const statutNormalise = (res.statut || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      if (statutNormalise !== "paye") {
        return new Response(
          JSON.stringify({ error: `Peman pa konfime. Statut aktyèl: ${res.statut}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // ── Fetch service + freelancer ──────────────────────────────────────────
    let serviceName = "Sèvis DJ Innovations";
    let freelancerNom = "DJ Innovations";
    let freelancerEmail: string | null = null;

    if (res.service_ids && res.service_ids.length > 0) {
      const { data: svc } = await supabase
        .from("services")
        .select("nom, freelancer_id")
        .eq("id", res.service_ids[0])
        .single();

      if (svc) {
        serviceName = svc.nom;
        if (svc.freelancer_id) {
          const { data: fl } = await supabase
            .from("freelancers")
            .select("nom, email")
            .eq("id", svc.freelancer_id)
            .single();
          if (fl) {
            freelancerNom = fl.nom;
            freelancerEmail = fl.email;
          }
        }
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FORMATEUR_EMAIL = Deno.env.get("FORMATEUR_EMAIL");
    const LOGO_URL = Deno.env.get("LOGO_URL") ?? null; // optional: public PNG/JPG URL

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY pa konfigire.");
    if (!res.email) throw new Error("Imèl kliyan an manke.");

    const finalFreelancerEmail = freelancerEmail ?? FORMATEUR_EMAIL ?? "info@djinnovations.com";
    const clientFullName = `${res.prenom ?? ""} ${res.nom ?? ""}`.trim();
    const hasSlots = Array.isArray(res.horaires) && res.horaires.length > 0;

    // ── Generate PDF ────────────────────────────────────────────────────────
    const pdfBytes = await generateInvoicePDF({
      reservationId: reservation_id,
      clientPrenom: res.prenom ?? "",
      clientNom: res.nom ?? "",
      clientEmail: res.email,
      clientTelephone: res.telephone ?? null,
      serviceName,
      freelancerNom,
      freelancerEmail: finalFreelancerEmail,
      montantTotal: res.montant_total ?? 0,
      horaires: hasSlots ? res.horaires : [],
      logoUrl: LOGO_URL,
    });

    const pdfBase64 = uint8ToBase64(pdfBytes);

    // ── HTML slots ──────────────────────────────────────────────────────────
    const slotsHtmlClient = hasSlots
      ? res.horaires.map((h: { date: string; time: string }) =>
        `<li>${h.date} à ${h.time}</li>`
      ).join("")
      : `<li style="color:#BA7517;">⏳ Ou pa chwazi yon kreno orè. Freelancer w lan ap kontakte w dirèkteman.</li>`;

    const slotsHtmlFreelancer = hasSlots
      ? res.horaires.map((h: { date: string; time: string }) =>
        `<li>${h.date} à ${h.time}</li>`
      ).join("")
      : `<li style="color:#c0392b;">⚠️ Kliyan an pa chwazi kreno orè. Ou dwe kontakte l dirèkteman.</li>`;

    // ── Email to Customer (with PDF attachment) ──────────────────────────────
    const customerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
        to: res.email,
        subject: `Fakti Elektwonik - ${serviceName} — DJ Innovations`,
        attachments: [
          {
            filename: `facture-djinnovations-${reservation_id.slice(0, 8)}.pdf`,
            content: pdfBase64,
          },
        ],
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;border-radius:8px;">
            <h2 style="color:#BA7517;margin-bottom:4px;">DJ Innovations</h2>
            <hr style="border-color:#eee;">
            <h1 style="font-size:22px;">Mèsi pou konfyans ou, ${res.prenom}!</h1>
            <p>Peman ou pou sèvis <strong>${serviceName}</strong> an byen pase.
               <strong>Fakti PDF ou nan pièce jointe.</strong></p>

            <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;">
              <p style="margin:6px 0;"><strong>Freelancer ou:</strong> ${freelancerNom}</p>
              <p style="margin:6px 0;"><strong>Imèl Freelancer:</strong> ${finalFreelancerEmail}</p>
              <p style="margin:6px 0;"><strong>Sèvis:</strong> ${serviceName}</p>
              <p style="margin:6px 0;"><strong>Pri peye:</strong> $${res.montant_total} USD</p>
              <p style="margin:6px 0;"><strong>Nimewo Rezèvasyon:</strong> #${reservation_id}</p>
            </div>

            <p><strong>Orè ou chwazi yo:</strong></p>
            <ul>${slotsHtmlClient}</ul>

            ${hasSlots
            ? `<p>Freelancer w lan ap kontakte w nan <strong>24 a 48 èdtan</strong> pou kòmanse.</p>`
            : `<div style="background:#fff8e1;border-left:4px solid #BA7517;padding:12px 16px;border-radius:4px;margin:16px 0;">
                   <p style="margin:0;"><strong>Pwochen etap:</strong> <strong>${freelancerNom}</strong> ap kontakte w nan <strong>24 a 48 èdtan</strong>.</p>
                   <p style="margin:8px 0 0;">Imèl: <a href="mailto:${finalFreelancerEmail}">${finalFreelancerEmail}</a></p>
                 </div>`
          }
            <hr style="border-color:#eee;">
            <p style="font-size:12px;color:#888;">© ${new Date().getFullYear()} DJ Innovations. Tout dwa rezève.</p>
          </div>
        `,
      }),
    });

    if (!customerRes.ok) {
      const errBody = await customerRes.json();
      throw new Error(`Erè anvwa imèl kliyan: ${JSON.stringify(errBody)}`);
    }

    // ── Email to Freelancer (no PDF attachment) ──────────────────────────────
    const freelancerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
        to: finalFreelancerEmail,
        subject: `Nouvo Peman Resevwa! — DJ Innovations`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;border-radius:8px;">
            <h2 style="color:#BA7517;">DJ Innovations</h2>
            <hr style="border-color:#eee;">
            <h1 style="font-size:22px;">Ou gen yon nouvo rezèvasyon, ${freelancerNom}!</h1>
            <p>Kliyan <strong>${clientFullName}</strong> fenk peye pou sèvis <strong>${serviceName}</strong>.</p>

            <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;">
              <p style="margin:6px 0;"><strong>Nimewo Rezèvasyon:</strong> #${reservation_id}</p>
              <p style="margin:6px 0;"><strong>Imèl kliyan:</strong> ${res.email}</p>
              <p style="margin:6px 0;"><strong>Telefòn:</strong> ${res.telephone ?? "Okenn"}</p>
              <p style="margin:6px 0;"><strong>Mesaj:</strong> ${res.message ?? "Okenn"}</p>
              <p style="margin:6px 0;"><strong>Montan resevwa:</strong> $${res.montant_total} USD</p>
            </div>

            <p><strong>Orè chwazi:</strong></p>
            <ul>${slotsHtmlFreelancer}</ul>

            ${hasSlots
            ? `<p>Tanpri kontakte kliyan an nan <strong>24 a 48 èdtan</strong>.</p>`
            : `<div style="background:#fff3f3;border-left:4px solid #c0392b;padding:12px 16px;border-radius:4px;margin:16px 0;">
                   <p style="margin:0;"><strong>⚠️ Aksyon obligatwa:</strong> Kliyan an pa te chwazi yon kreno. Ou <strong>dwe kontakte l dirèkteman</strong> nan 24-48 èdtan.</p>
                   <p style="margin:8px 0 0;">Imèl: <a href="mailto:${res.email}">${res.email}</a></p>
                   ${res.telephone ? `<p style="margin:4px 0 0;">Telefòn: <strong>${res.telephone}</strong></p>` : ""}
                 </div>`
          }
            <hr style="border-color:#eee;">
            <p style="font-size:12px;color:#888;">© ${new Date().getFullYear()} DJ Innovations. Tout dwa rezève.</p>
          </div>
        `,
      }),
    });

    if (!freelancerRes.ok) {
      const errBody = await freelancerRes.json();
      throw new Error(`Erè anvwa imèl freelancer: ${JSON.stringify(errBody)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Imèl ak fakti PDF voye ak siksè bay kliyan. Notifikasyon voye bay freelancer.",
        sent_to: {
          client: res.email,
          freelancer: finalFreelancerEmail,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[send-invoice-email] Erè:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erè enkoni." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});