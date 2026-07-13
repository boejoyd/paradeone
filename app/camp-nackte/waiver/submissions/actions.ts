"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { normalizeCampPhone } from "@/lib/campNackteWaiver";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function staffClient() { await requireUser(); return createServerSupabaseClient(); }

export async function revokeCampWaiver(formData: FormData) {
  const supabase = await staffClient();
  const { error } = await supabase.from("camp_nackte_waivers").update({ status: "revoked" }).eq("id", String(formData.get("waiverId") || ""));
  if (error) throw new Error(error.message); revalidatePath("/camp-nackte/waiver/submissions");
}

export async function markCampGuestIdentityCorrected(formData: FormData) {
  const supabase = await staffClient();
  const { error } = await supabase.from("camp_guests").update({ identity_corrected_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", String(formData.get("guestId") || ""));
  if (error) throw new Error(error.message); revalidatePath("/camp-nackte/waiver/submissions");
}

export async function createCampGuest(formData: FormData) {
  const supabase = await staffClient();
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const rawPhone = String(formData.get("phone") || "");
  const phone = rawPhone ? normalizeCampPhone(rawPhone) : null;
  const { error } = await supabase.from("camp_guests").insert({ legal_name: String(formData.get("legalName") || "").trim(), preferred_name: String(formData.get("preferredName") || "").trim() || null, email, phone });
  if (error) throw new Error(error.message); revalidatePath("/camp-nackte/waiver/submissions");
}

export async function linkPassSlotToGuest(formData: FormData) {
  const supabase = await staffClient();
  const { error } = await supabase.from("day_pass_attendees").update({ guest_id: String(formData.get("guestId") || "") }).eq("id", String(formData.get("slotId") || ""));
  if (error) throw new Error(error.message); revalidatePath("/camp-nackte/waiver/submissions");
}
