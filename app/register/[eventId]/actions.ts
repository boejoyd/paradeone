"use server";

import { redirect } from "next/navigation";

import { parseVehicleType } from "@/lib/entries/vehicleTypes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ENTRY_TYPES = new Set([
  "float",
  "walking_group",
  "vehicle",
  "band",
  "motorcycle_group",
  "dignitary",
  "sponsor",
  "other",
]);

export type RegistrationActionState = {
  status: "idle" | "error";
  message: string;
};

export const initialRegistrationState: RegistrationActionState = {
  status: "idle",
  message: "",
};

function errorState(message: string): RegistrationActionState {
  return { status: "error", message };
}

function trimmed(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function submitPublicRegistration(
  eventId: string,
  _previousState: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  if (trimmed(formData, "website")) {
    return initialRegistrationState;
  }

  const entryName = trimmed(formData, "entryName");
  const entryType = trimmed(formData, "entryType");
  const contactName = trimmed(formData, "contactName");
  const contactEmail = trimmed(formData, "contactEmail").toLowerCase();
  const contactPhone = trimmed(formData, "contactPhone");
  const announcerScript = trimmed(formData, "announcerScript");
  const estimatedLength = Number(formData.get("estimatedLengthFeet") || 0);
  const acceptedTerms = trimmed(formData, "acceptTerms") === "agree";

  if (entryName.length < 2 || entryName.length > 160) {
    return errorState("Enter an entry name between 2 and 160 characters.");
  }
  if (!ENTRY_TYPES.has(entryType)) {
    return errorState("Select a valid entry type.");
  }
  if (contactName.length < 2 || contactName.length > 160) {
    return errorState("Enter the primary contact's name.");
  }
  if (!contactEmail.includes("@") || contactEmail.length > 254) {
    return errorState("Enter a valid contact email address.");
  }
  if (contactPhone.length > 40) {
    return errorState("Enter a valid contact phone number.");
  }
  if (!Number.isFinite(estimatedLength) || estimatedLength < 1 || estimatedLength > 2000) {
    return errorState("Enter an estimated entry length between 1 and 2,000 feet.");
  }
  if (announcerScript.length > 3000) {
    return errorState("The announcer script must be 3,000 characters or fewer.");
  }
  if (!acceptedTerms) {
    return errorState("You must confirm that the registration information is accurate.");
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return errorState("Registration is temporarily unavailable. Please contact the parade organizer.");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return errorState("This parade registration could not be found.");
  }
  if (event.status !== "registration_open") {
    return errorState("Registration for this parade is currently closed.");
  }

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({
      event_id: eventId,
      name: entryName,
      entry_type: entryType,
      vehicle_type: parseVehicleType(formData.get("vehicleType")),
      status: "submitted",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      announcer_script: announcerScript || null,
      estimated_length_feet: estimatedLength,
      sms_opt_in: false,
      sms_opt_in_at: null,
      sms_opt_in_source: null,
    })
    .select("id")
    .single();

  if (insertError || !entry) {
    return errorState("We could not save your registration. Please try again.");
  }

  const reference = `PO-${entry.id.slice(0, 8).toUpperCase()}`;
  redirect(`/register/${eventId}/thank-you?reference=${encodeURIComponent(reference)}`);
}
