"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function createEntry(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  let organizationId = String(formData.get("organizationId") || "");
  const smsOptIn = String(formData.get("smsConsent") || "") === "agree";

  if (!organizationId) {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("organization_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event?.organization_id) {
      throw new Error(eventError?.message || "Unable to determine organization.");
    }

    organizationId = event.organization_id;
  }

  await requireOrganizationRole(organizationId, ["owner", "admin", "staff"]);

  const { error } = await supabase.from("entries").insert({
    event_id: eventId,
    name: String(formData.get("name") || "").trim(),
    entry_type: String(formData.get("entryType") || "float"),
    status: "draft",
    contact_name: String(formData.get("contactName") || "").trim() || null,
    contact_email: String(formData.get("contactEmail") || "").trim() || null,
    contact_phone: String(formData.get("contactPhone") || "").trim() || null,
    announcer_script:
      String(formData.get("announcerScript") || "").trim() || null,
    estimated_length_feet:
      Number(formData.get("estimatedLengthFeet") || 0) || null,
    sms_opt_in: smsOptIn,
    sms_opt_in_at: smsOptIn ? new Date().toISOString() : null,
    sms_opt_in_source: smsOptIn ? "parade_registration" : null,
    privacy_policy_version: smsOptIn ? "1.0" : null,
    terms_version: smsOptIn ? "1.0" : null,
    sms_terms_version: smsOptIn ? "1.0" : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/organizations/${slug}/parades/${eventId}/entries`);
}
