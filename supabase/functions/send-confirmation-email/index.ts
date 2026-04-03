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
  serviceList: string[];
  freelancerNom: string;
  freelancerEmail: string;
  montantTotal: number;
  prixUnitaire: number;
  horaires: { date: string; time: string }[];
  logoUrl: string | null;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const W = 595.28;
  const H = 841.89;
  const page = pdfDoc.addPage([W, H]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let logoImage: any = null;
  if (params.logoUrl) {
    try {
      const logoResp = await fetch(params.logoUrl);
      if (logoResp.ok) {
        const logoBytes = await logoResp.arrayBuffer();
        const ct = logoResp.headers.get("content-type") ?? "";
        if (ct.includes("png")) logoImage = await pdfDoc.embedPng(logoBytes);
        else if (ct.includes("jpeg") || ct.includes("jpg")) logoImage = await pdfDoc.embedJpg(logoBytes);
      }
    } catch (_) {}
  }

  const draw = (text: string, x: number, y: number, opts: any = {}) => {
    page.drawText(String(text), {
      x, y, font: opts.font ?? fontRegular, size: opts.size ?? 10, color: opts.color ?? COLOR_DARK,
    });
  };

  const rect = (x: number, y: number, w: number, h: number, color: any) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
  };

  const hline = (y: number, x1 = 40, x2 = W - 40) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: COLOR_LINE });
  };

  // HEADER BAND
  rect(0, H - 95, W, 95, COLOR_GOLD);
  
  if (logoImage) {
    const logoDims = logoImage.scale(0.22);
    page.drawImage(logoImage, { 
      x: 40, 
      y: H - 75, 
      width: logoDims.width, 
      height: logoDims.height 
    });
  } else {
    draw("DJ Innovations", 40, H - 48, { font: fontBold, size: 22, color: COLOR_WHITE });
  }

  // FAKTI Label + Reference
  draw("FAKTI", W - 160, H - 45, { font: fontBold, size: 28, color: COLOR_WHITE });
  const invoiceRef = `#${params.reservationId.slice(0, 8).toUpperCase()}`;
  draw(invoiceRef, W - 160, H - 65, { font: fontBold, size: 12, color: COLOR_WHITE });
  draw(new Date().toLocaleDateString("ht-HT"), W - 160, H - 80, { size: 10, color: COLOR_WHITE });

  // SENDER (Freelancer Real Info)
  let y = H - 125;
  draw("Soti nan / Emetteur", 40, y, { font: fontBold, size: 9, color: COLOR_GRAY });
  y -= 18;
  draw(params.freelancerNom, 40, y, { font: fontBold, size: 12 });
  y -= 15;
  draw(params.freelancerEmail, 40, y, { size: 10, color: COLOR_GOLD });
  y -= 12;
  draw("freelancer.konektegroup.com", 40, y, { size: 9, color: COLOR_GRAY });

  // RECEIVER (Client Info)
  let yR = H - 125;
  draw("Pou Kliyan / Destinataire", W / 2 + 20, yR, { font: fontBold, size: 9, color: COLOR_GRAY });
  yR -= 18;
  draw(`${params.clientPrenom} ${params.clientNom}`, W / 2 + 20, yR, { font: fontBold, size: 12 });
  yR -= 15;
  draw(params.clientEmail, W / 2 + 20, yR, { size: 10, color: COLOR_GRAY });
  if (params.clientTelephone) {
      yR -= 12;
      draw(params.clientTelephone, W / 2 + 20, yR, { size: 9, color: COLOR_GRAY });
  }

  y = Math.min(y, yR) - 30;
  hline(y);

  // TABLE HEADER
  y -= 25;
  rect(40, y - 6, W - 80, 24, COLOR_GOLD);
  draw("Deskripsyon Sèvis / Description", 52, y + 4, { font: fontBold, size: 9, color: COLOR_WHITE });
  draw("Freelancer", 300, y + 4, { font: fontBold, size: 9, color: COLOR_WHITE });
  draw("Montan (USD)", W - 140, y + 4, { font: fontBold, size: 9, color: COLOR_WHITE });

  y -= 28;
  // TABLE CONTENT
  params.serviceList.forEach((svc, idx) => {
    rect(40, y - 6, W - 80, 24, idx % 2 === 0 ? COLOR_LGRAY : COLOR_WHITE);
    draw(svc, 52, y + 4, { size: 10 });
    draw(params.freelancerNom, 300, y + 4, { size: 10 });
    draw(idx === 0 ? `$${params.montantTotal.toFixed(2)}` : "-", W - 140, y + 4, { font: fontBold, size: 10 });
    y -= 28;
  });

  y -= 15;
  hline(y);

  // TOTALS
  y -= 20;
  draw("Soutotal", W - 240, y, { size: 10, color: COLOR_GRAY });
  draw(`$${params.montantTotal.toFixed(2)} USD`, W - 140, y, { size: 10 });
  y -= 18;
  draw("Taks (Vat)", W - 240, y, { size: 10, color: COLOR_GRAY });
  draw("Enkli", W - 140, y, { size: 10, color: COLOR_GRAY });
  
  y -= 10;
  hline(y, W - 250, W - 40);
  y -= 28;

  // BIG TOTAL BOX
  rect(W - 250, y - 10, 210, 35, COLOR_GOLD);
  draw("TOTAL PEYE", W - 240, y + 5, { font: fontBold, size: 11, color: COLOR_WHITE });
  draw(`$${params.montantTotal.toFixed(2)} USD`, W - 140, y + 5, { font: fontBold, size: 14, color: COLOR_WHITE });

  // HORAIRES / SCHEDULE
  y -= 60;
  hline(y + 15);
  draw("Orè ak Kreno ou chwazi yo / Schedule details", 40, y, { font: fontBold, size: 11, color: COLOR_GOLD });
  y -= 25;

  if (params.horaires.length > 0) {
    params.horaires.forEach(slot => {
      draw(`-  Dat: ${slot.date}   -   Lè: ${slot.time}`, 52, y, { size: 10 });
      y -= 18;
    });
  } else {
    draw("Pa gen kreno chwazi anko. Freelancer a ap kontakte w pèsonèlman.", 52, y, { size: 10, color: COLOR_GRAY });
    y -= 18;
  }

  // FREELANCER REAL CONTACT (Requested by user)
  y -= 30;
  hline(y + 10);
  draw("Enfòmasyon Freelancer / Vendor Info", 40, y - 5, { font: fontBold, size: 11 });
  y -= 22;
  draw(`Non Freelancer:  ${params.freelancerNom}`, 52, y, { size: 10 });
  y -= 18;
  draw(`Imèl Sipò:    ${params.freelancerEmail}`, 52, y, { font: fontBold, size: 10, color: COLOR_GOLD });

  // PEYE BADGE
  y -= 45;
  rect(40, y - 10, 180, 28, rgb(0.18, 0.64, 0.44));
  draw("PÈMAN KONFIME [OK]", 52, y + 2, { font: fontBold, size: 10, color: COLOR_WHITE });

  // DUREE LIMITE (Requested by user)
  const dureeMwa = Math.max(1, Math.round(params.montantTotal / (params.prixUnitaire || params.montantTotal || 1)));
  const labelMwa = dureeMwa === 1 ? "1 mwa" : `${dureeMwa} Mwa`;
  
  draw(`Dure limite:  ${labelMwa}`, 40 + 200, y + 2, { font: fontBold, size: 11, color: COLOR_GOLD });

  // FOOTER
  rect(0, 0, W, 45, COLOR_LGRAY);
  hline(45);
  draw(`© ${new Date().getFullYear()} DJ Innovations — Siksè ou se priyorite nou.`, 40, 18, { size: 9, color: COLOR_GRAY });
  draw(`Réf: ${params.reservationId}`, W - 180, 18, { size: 8, color: COLOR_GRAY });

  return await pdfDoc.save();
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("[send-confirmation-email] Body resevwa:", body);
    const { reservation_id, force, download } = body;

    if (!reservation_id) throw new Error("reservation_id oblije.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (force) {
        console.log("[send-confirmation-email] Force update statut to paye...");
        await supabase.from("reservations").update({ statut: "paye" }).eq("id", reservation_id);
    }

    const { data: res, error } = await supabase.from("reservations").select("*").eq("id", reservation_id).single();
    if (error || !res) {
        console.error("[send-confirmation-email] Rezèvasyon pa jwenn:", error);
        throw new Error("Rezèvasyon pa jwenn nan baz de done a.");
    }

    // Fetch services
    let serviceList = ["Sèvis DJ Innovations"];
    let freelancerNom = "Biduello Dieujuste";
    let freelancerEmail = "dieujustebiduello@gmail.com";
    let prixUnitaire = res.montant_total || 0;

    let sIds = res.service_ids;
    if (sIds && !Array.isArray(sIds)) {
        if (typeof sIds === 'string') sIds = [sIds];
        else sIds = [];
    }

    if (sIds && sIds.length > 0) {
      console.log("[send-confirmation-email] TRACE: sIds =", sIds);
      const { data: svcs } = await supabase.from("services").select("nom, freelancer_id, prix").in("id", sIds);
      if (svcs && svcs.length > 0) {
        serviceList = svcs.map(s => s.nom);
        prixUnitaire = svcs[0].prix;
        
        const fId = svcs[0].freelancer_id;
        if (fId) {
            const { data: fl } = await supabase.from("freelancers").select("nom, email").eq("id", fId).single();
            if (fl) { 
                freelancerNom = fl.nom; 
                freelancerEmail = fl.email; 
            }
        }
      }
    }

    console.log("[send-confirmation-email] Generating PDF for:", freelancerNom);
    const pdfBytes = await generateInvoicePDF({
      reservationId: reservation_id,
      clientPrenom: res.prenom || "",
      clientNom: res.nom || "",
      clientEmail: res.email,
      clientTelephone: res.telephone,
      serviceList,
      freelancerNom,
      freelancerEmail,
      montantTotal: res.montant_total || 0,
      prixUnitaire: prixUnitaire,
      horaires: res.horaires || [],
      logoUrl: Deno.env.get("LOGO_URL") || "https://freelancer.konektegroup.com/assets/logo.png",
    });
    console.log("[send-confirmation-email] PDF Generated successfully.");

    if (download) {
      console.log("[send-confirmation-email] Returning PDF raw bytes for download/preview.");
      return new Response(pdfBytes, {
        headers: { 
            ...corsHeaders, 
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="fakti-${reservation_id}.pdf"`
        }
      });
    }

    const pdfBase64 = uint8ToBase64(pdfBytes);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY pa konfigire nan Edge Function.");

    console.log("[send-confirmation-email] Sending email via Resend to:", res.email);
    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "DJ Innovations <noreply@freelancer.konektegroup.com>",
        to: res.email,
        subject: `Fakti Konfime - ${serviceList[0]}`,
        attachments: [{ filename: `fakti-${reservation_id.slice(0,8)}.pdf`, content: pdfBase64 }],
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:25px;border-radius:12px;">
            <h2 style="color:#BA7517;">DJ Innovations</h2>
            <p>Bonjou ${res.prenom}, mèsi pou konfyans ou!</p>
            <p>Peman ou pou sèvis <strong>${serviceList.join(", ")}</strong> an byen pase.</p>
            <p><strong>Freelancer ou a:</strong> ${freelancerNom} (<a href="mailto:${freelancerEmail}">${freelancerEmail}</a>)</p>
            <p>Ou ap jwenn faktis PDF ou a tache nan imèl sa a.</p>
            <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
            <p style="font-size:12px;color:#888;">© ${new Date().getFullYear()} DJ Innovations. Siksè ou se priyorite nou.</p>
          </div>
        `
      }),
    });

    if (!emailResp.ok) {
        const emailErr = await emailResp.text();
        console.error("[send-confirmation-email] Resend Error:", emailErr);
        throw new Error(`Erè nan voye imèl: ${emailErr}`);
    }

    console.log("[send-confirmation-email] Email sent successfully.");
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[send-confirmation-email] Global Catch Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});