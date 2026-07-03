import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();

  const { fullName, email, phone, visitDate, waiverText, signatureDataUrl } =
    body;

  if (!fullName || !visitDate || (!email && !phone) || !signatureDataUrl) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const signedAt = new Date();

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;

  doc.setFontSize(18);
  doc.text("Nackte LLC Waiver", margin, 20);

  doc.setFontSize(11);
  doc.text(`Name: ${fullName}`, margin, 32);
  doc.text(`Email: ${email || "Not provided"}`, margin, 39);
  doc.text(`Phone: ${phone || "Not provided"}`, margin, 46);
  doc.text(`Visit Date: ${visitDate}`, margin, 53);
  doc.text(`Signed At: ${signedAt.toLocaleString()}`, margin, 60);

  const lines = doc.splitTextToSize(waiverText, usableWidth);
  let y = 72;

  lines.forEach((line: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.text(line, margin, y);
    y += 6;
  });

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.text("Signature:", margin, y + 10);
  doc.addImage(signatureDataUrl, "PNG", margin, y + 15, 80, 35);

  const pdfArrayBuffer = doc.output("arraybuffer");

  const safeName = fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fileName = `${visitDate}/${Date.now()}-${safeName}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("camp-nackte-waivers")
    .upload(fileName, pdfArrayBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("camp-nackte-waivers")
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from("camp_nackte_waivers")
    .insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      visit_date: visitDate,
      waiver_text: waiverText,
      signature_data_url: null,
      pdf_url: publicUrlData.publicUrl,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
