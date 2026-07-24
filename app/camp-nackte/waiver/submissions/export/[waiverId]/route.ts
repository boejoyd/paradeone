import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ waiverId: string }> }) {
  await requireUser();
  const { waiverId } = await params;
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "The Camp Nackte waiver service is not configured." }, { status: 503 });
  const { data: waiver, error } = await supabase.from("camp_nackte_waivers").select("id, guest_id, full_name, email, phone, visit_date, waiver_text, signature_data_url, created_at, signed_at, expires_at, waiver_version, status, confirmation_number").eq("id", waiverId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!waiver) return NextResponse.json({ error: "Waiver not found." }, { status: 404 });
  return new NextResponse(JSON.stringify({ exportType: "camp_nackte_retained_waiver_record", exportedAt: new Date().toISOString(), warning: waiver.signature_data_url ? null : "The original signature image and signed PDF are not retained in this database record. This export is not a replacement signed PDF.", waiver }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="camp-nackte-waiver-${waiverId}.json"`, "Cache-Control": "private, no-store" },
  });
}
