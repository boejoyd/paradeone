"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const REVIEW_STATUSES = new Set(["submitted", "needs_review", "approved", "rejected"]);

export async function updateRegistrationStatus(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const entryId = String(formData.get("entryId") || "");
  const status = String(formData.get("status") || "");
  if (!slug || !eventId || !entryId || !REVIEW_STATUSES.has(status)) {
    throw new Error("Invalid registration review request.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();
  if (eventError || !event?.organization_id) throw new Error(eventError?.message || "Parade not found.");

  await requireOrganizationRole(event.organization_id, ["owner", "admin", "staff"]);

  const values: Record<string, unknown> = { status };
  if (status !== "approved") {
    values.parade_number = null;
    values.lineup_position = null;
    values.staging_spot_id = null;
  }

  const { error } = await supabase
    .from("entries")
    .update(values)
    .eq("id", entryId)
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath(`/organizations/${slug}/parades/${eventId}/entries/review`);
  revalidatePath(`/organizations/${slug}/parades/${eventId}/entries`);
  revalidatePath(`/organizations/${slug}/parades/${eventId}/lineup`);
}
