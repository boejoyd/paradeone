"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function assignStagingSpot(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const entryId = String(formData.get("entryId") || "");
  const stagingSpotId = String(formData.get("stagingSpotId") || "");

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

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/organizations/${slug}/parades/${eventId}/entries`);
}
