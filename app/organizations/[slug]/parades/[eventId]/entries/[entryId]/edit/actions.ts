"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("entries")
    .update({
      name: String(formData.get("name") || "").trim(),
      entry_type: String(formData.get("entryType") || "float"),
      status: String(formData.get("status") || "draft"),
      contact_name: String(formData.get("contactName") || "").trim() || null,
      contact_email: String(formData.get("contactEmail") || "").trim() || null,
      contact_phone: String(formData.get("contactPhone") || "").trim() || null,
      estimated_length_feet:
        Number(formData.get("estimatedLengthFeet") || 0) || null,
      announcer_script:
        String(formData.get("announcerScript") || "").trim() || null,
      staging_spot_id: String(formData.get("stagingSpotId") || "") || null,
    })
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}/parades/${eventId}/entries/${entryId}`);
}
