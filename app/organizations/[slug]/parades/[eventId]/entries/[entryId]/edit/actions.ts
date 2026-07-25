"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseVehicleType } from "@/lib/entries/vehicleTypes";

export async function updateEntry(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const entryId = String(formData.get("entryId") || "");
  const supabase = await createServerSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event?.organization_id) {
    throw new Error(eventError?.message || "Parade not found.");
  }

  await requireOrganizationRole(event.organization_id, ["owner", "admin", "staff"]);

  const { data: existingEntry, error: existingEntryError } = await supabase
    .from("entries")
    .select("sms_opt_in, sms_opt_in_at, sms_opt_in_source")
    .eq("id", entryId)
    .eq("event_id", eventId)
    .single();

  if (existingEntryError || !existingEntry) {
    throw new Error(existingEntryError?.message || "Entry not found.");
  }

  const smsOptIn = formData.get("smsOptIn") === "on";
  const smsConsentChanged = existingEntry.sms_opt_in !== smsOptIn;
  const smsConsentUpdatedAt = new Date().toISOString();

  const { error } = await supabase
    .from("entries")
    .update({
      name: String(formData.get("name") || "").trim(),
      entry_type: String(formData.get("entryType") || "float"),
      vehicle_type: parseVehicleType(formData.get("vehicleType")),
      status: String(formData.get("status") || "draft"),
      contact_name: String(formData.get("contactName") || "").trim() || null,
      contact_email: String(formData.get("contactEmail") || "").trim() || null,
      contact_phone: String(formData.get("contactPhone") || "").trim() || null,
      estimated_length_feet:
        Number(formData.get("estimatedLengthFeet") || 0) || null,
      announcer_script:
        String(formData.get("announcerScript") || "").trim() || null,
      staging_spot_id: String(formData.get("stagingSpotId") || "") || null,
      sms_opt_in: smsOptIn,
      sms_opt_in_at: smsOptIn
        ? existingEntry.sms_opt_in_at || smsConsentUpdatedAt
        : null,
      sms_opt_in_source: smsOptIn
        ? existingEntry.sms_opt_in_source || "organizer_confirmed_consent"
        : null,
    })
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  if (smsConsentChanged) {
    const { data: participant } = await supabase
      .from("communication_participants")
      .select("id, sms_consent_status")
      .eq("event_id", eventId)
      .eq("parade_unit_id", entryId)
      .maybeSingle();

    if (participant && (!smsOptIn || participant.sms_consent_status !== "opted_out")) {
      const { error: participantError } = await supabase
        .from("communication_participants")
        .update({
          sms_consent_status: smsOptIn ? "opted_in" : "opted_out",
          sms_consent_updated_at: smsConsentUpdatedAt,
        })
        .eq("id", participant.id);

      if (participantError) {
        throw new Error(participantError.message);
      }
    }
  }

  redirect(`/organizations/${slug}/parades/${eventId}/entries/${entryId}`);
}
