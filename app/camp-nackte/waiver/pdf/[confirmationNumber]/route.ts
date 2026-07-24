import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { CAMP_NACKTE_WAIVER_BUCKET } from "@/lib/campNackteWaiverPdf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ confirmationNumber: string }> }) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "The waiver PDF service is temporarily unavailable." }, { status: 503 });
  }

  const { confirmationNumber } = await params;
  const token = new URL(request.url).searchParams.get("token") || "";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: session, error: sessionError } = await supabase.from("camp_guest_lookup_sessions").select("guest_id, expires_at").eq("token_hash", tokenHash).maybeSingle();
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "PDF access has expired." }, { status: 401 });
  const { data: waiver, error } = await supabase.from("camp_nackte_waivers").select("pdf_storage_path").eq("guest_id", session.guest_id).eq("confirmation_number", confirmationNumber.toUpperCase()).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!waiver?.pdf_storage_path) return NextResponse.json({ error: "Waiver PDF not found." }, { status: 404 });
  const { data, error: signedUrlError } = await supabase.storage.from(CAMP_NACKTE_WAIVER_BUCKET).createSignedUrl(waiver.pdf_storage_path, 60 * 10);
  if (signedUrlError || !data?.signedUrl) return NextResponse.json({ error: signedUrlError?.message || "Unable to create a PDF link." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
