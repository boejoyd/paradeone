import { CampNackteWaiverSubmissionsClient } from "@/components/waiver/CampNackteWaiverSubmissionsClient";
import { requireUser } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function CampNackteWaiverSubmissionsPage() {
  await requireUser();
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("The Camp Nackte waiver service is not configured.");
  const { error: expirationError } = await supabase.from("camp_nackte_waivers").update({ status: "expired" }).eq("status", "current").lte("expires_at", new Date().toISOString());
  if (expirationError) throw new Error(expirationError.message);
  const [{ data: waivers, error }, { data: guests, error: guestsError }, { data: purchases, error: purchasesError }, { data: slots, error: slotsError }] = await Promise.all([
    supabase.from("camp_nackte_waivers").select("id, guest_id, full_name, email, phone, visit_date, waiver_text, signature_data_url, pdf_url, pdf_storage_path, signed_at, expires_at, waiver_version, status, confirmation_number").order("signed_at", { ascending: false }),
    supabase.from("camp_guests").select("id, legal_name, preferred_name, email, phone, identity_corrected_at").order("legal_name"),
    supabase.from("day_pass_purchases").select("id, purchaser_name, purchase_date, admission_date, quantity, source").order("purchase_date", { ascending: false }),
    supabase.from("day_pass_attendees").select("id, purchase_id, guest_id, attendee_name, confirmation_code, slot_number").order("created_at", { ascending: false }),
  ]);
  if (error || guestsError || purchasesError || slotsError) throw new Error(error?.message || guestsError?.message || purchasesError?.message || slotsError?.message || "Unable to load the waiver dashboard.");

  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white md:px-8"><section className="mx-auto max-w-7xl">
    <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"><p className="text-sm uppercase tracking-[0.4em] text-slate-400">Camp Nackte Staff</p><h1 className="mt-4 text-3xl font-bold">Annual Waivers & Day Passes</h1><p className="mt-3 text-slate-300">Manage verified guests, annual waiver status, and future day-pass attendee links.</p></header>
    <CampNackteWaiverSubmissionsClient submissions={(waivers || []).map((waiver) => ({ id: waiver.id, guest_id: waiver.guest_id, full_name: waiver.full_name, email: waiver.email, phone: waiver.phone, visit_date: waiver.visit_date, waiver_text: waiver.waiver_text, signature_data_url: waiver.signature_data_url, signed_at: waiver.signed_at, expires_at: waiver.expires_at, waiver_version: waiver.waiver_version, status: waiver.status, confirmation_number: waiver.confirmation_number, pdfOpenUrl: waiver.pdf_storage_path || waiver.pdf_url ? `/camp-nackte/waiver/submissions/pdf/${waiver.id}` : null }))} guests={guests || []} purchases={purchases || []} slots={slots || []} />
  </section></main>;
}
