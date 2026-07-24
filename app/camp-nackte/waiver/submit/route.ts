import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

import { addCalendarYear, CAMP_NACKTE_WAIVER_TEXT, CAMP_NACKTE_WAIVER_VERSION } from "@/lib/campNackteWaiver";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function pdfFilename(value: string) {
  return `${value.replace(/(?:\.pdf)+$/i, "")}.pdf`;
}

export async function POST(request: Request) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "The waiver service is temporarily unavailable." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { lookupToken?: unknown; visitDate?: unknown; signatureDataUrl?: unknown } | null;
  const lookupToken = String(body?.lookupToken || "");
  const visitDate = String(body?.visitDate || "");
  const signatureDataUrl = String(body?.signatureDataUrl || "");
  if (!lookupToken || !visitDate || !signatureDataUrl.startsWith("data:image/png;base64,")) return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

  const tokenHash = createHash("sha256").update(lookupToken).digest("hex");
  const { data: session, error: sessionError } = await supabase.from("camp_guest_lookup_sessions").select("id, guest_id, day_pass_purchase_id, expires_at, used_at").eq("token_hash", tokenHash).maybeSingle();
  if (sessionError) return NextResponse.json({ error: "Unable to verify the lookup session." }, { status: 500 });
  if (!session || session.used_at || new Date(session.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Guest verification expired. Please look up the guest again." }, { status: 401 });

  const { data: claimedSession, error: claimError } = await supabase.from("camp_guest_lookup_sessions").update({ used_at: new Date().toISOString() }).eq("id", session.id).is("used_at", null).select("id").maybeSingle();
  if (claimError) return NextResponse.json({ error: "Unable to claim the lookup session." }, { status: 500 });
  if (!claimedSession) return NextResponse.json({ error: "This guest verification has already been used." }, { status: 409 });

  const { error: expirationError } = await supabase.from("camp_nackte_waivers").update({ status: "expired" }).eq("guest_id", session.guest_id).eq("status", "current").lte("expires_at", new Date().toISOString());
  if (expirationError) return NextResponse.json({ error: "Unable to update waiver expiration status." }, { status: 500 });
  const [{ data: guest, error: guestError }, { data: currentWaiver, error: currentWaiverError }] = await Promise.all([
    supabase.from("camp_guests").select("id, legal_name, preferred_name, email, phone").eq("id", session.guest_id).single(),
    supabase.from("camp_nackte_waivers").select("id, signed_at, expires_at").eq("guest_id", session.guest_id).eq("status", "current").gt("expires_at", new Date().toISOString()).maybeSingle(),
  ]);
  if (guestError || currentWaiverError) return NextResponse.json({ error: "Unable to load the verified guest waiver status." }, { status: 500 });
  if (!guest) return NextResponse.json({ error: "Guest not found." }, { status: 404 });
  if (currentWaiver) return NextResponse.json({ currentWaiver }, { status: 409 });

  const signedAt = new Date();
  const expiresAt = addCalendarYear(signedAt);
  const confirmationNumber = `CN-${randomBytes(6).toString("hex").toUpperCase()}`;
  const doc = new jsPDF();
  const margin = 15;
  const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFontSize(18); doc.text("Nackte LLC Annual Waiver", margin, 20);
  doc.setFontSize(10);
  const details = [`Verified legal name: ${guest.legal_name}`, `Preferred name: ${guest.preferred_name || "Not provided"}`, `Effective when signed: ${signedAt.toLocaleString()} (${signedAt.toISOString()})`, `Expires at exact anniversary: ${expiresAt.toLocaleString()} (${expiresAt.toISOString()})`, `Waiver version: ${CAMP_NACKTE_WAIVER_VERSION}`, `Confirmation: ${confirmationNumber}`, `Day-pass reference: ${session.day_pass_purchase_id || "None"}`, `Visit date: ${visitDate}`];
  details.forEach((line, index) => doc.text(line, margin, 32 + index * 6));
  const lines = doc.splitTextToSize(CAMP_NACKTE_WAIVER_TEXT, usableWidth);
  let y = 86;
  for (const line of lines) { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, margin, y); y += 5; }
  if (y > 220) { doc.addPage(); y = 20; }
  doc.text("Signature:", margin, y + 10); doc.addImage(signatureDataUrl, "PNG", margin, y + 15, 80, 35);
  const pdf = doc.output("arraybuffer");
  const pdfHash = createHash("sha256").update(Buffer.from(pdf)).digest("hex");
  const path = `${signedAt.getUTCFullYear()}/${guest.id}/${pdfFilename(confirmationNumber)}`;
  const { error: uploadError } = await supabase.storage.from("camp-nackte-waivers").upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });

  const { error: supersedeError } = await supabase.from("camp_nackte_waivers").update({ status: "superseded" }).eq("guest_id", guest.id).eq("status", "current");
  if (supersedeError) {
    const { error: cleanupError } = await supabase.storage.from("camp-nackte-waivers").remove([path]);
    return NextResponse.json({ error: cleanupError ? `Unable to supersede the previous waiver; uploaded PDF cleanup also failed: ${cleanupError.message}` : "Unable to supersede the previous waiver." }, { status: 500 });
  }
  const { error: insertError } = await supabase.from("camp_nackte_waivers").insert({ guest_id: guest.id, full_name: guest.legal_name, email: guest.email, phone: guest.phone, visit_date: visitDate, waiver_text: CAMP_NACKTE_WAIVER_TEXT, signature_data_url: null, pdf_url: null, signed_at: signedAt.toISOString(), expires_at: expiresAt.toISOString(), waiver_version: CAMP_NACKTE_WAIVER_VERSION, status: "current", pdf_storage_path: path, pdf_hash: pdfHash, confirmation_number: confirmationNumber, linked_day_pass_purchase_id: session.day_pass_purchase_id });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from("camp-nackte-waivers").remove([path]);
    return NextResponse.json({ error: cleanupError ? `Database insert failed: ${insertError.message}. Uploaded PDF cleanup also failed: ${cleanupError.message}` : `Database insert failed: ${insertError.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true, confirmationNumber, expiresAt: expiresAt.toISOString(), pdfUrl: `/camp-nackte/waiver/pdf/${confirmationNumber}?token=${encodeURIComponent(lookupToken)}` });
}
