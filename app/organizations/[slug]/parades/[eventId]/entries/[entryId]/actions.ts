"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function assignStagingSpot(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const entryId = String(formData.get("entryId") || "");
  const stagingSpotId = String(formData.get("stagingSpotId") || "");
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
      staging_spot_id: stagingSpotId || null,
    })
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(
    `/organizations/${slug}/parades/${eventId}/entries/${entryId}`
  );
}
export async function deleteEntry(formData: FormData) {
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
    .delete()
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/organizations/${slug}/parades/${eventId}/entries`);
}
