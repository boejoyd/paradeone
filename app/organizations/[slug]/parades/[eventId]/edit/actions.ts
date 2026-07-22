"use server";

import { redirect } from "next/navigation";
import { requireOrganizationCapability } from "@/lib/organizations/permissions.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getEventOrganizationId(eventId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (error || !event?.organization_id) {
    throw new Error(error?.message || "Parade not found.");
  }

  return event.organization_id;
}

export async function updateParade(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const organizationId = await getEventOrganizationId(eventId);

  await requireOrganizationCapability(
    organizationId,
    "editEvents",
    `/organizations/${slug}/parades/${eventId}`
  );

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({
      name: String(formData.get("name") || "").trim(),
      event_date: String(formData.get("eventDate") || "") || null,
      start_time: String(formData.get("startTime") || "") || null,
      city: String(formData.get("city") || "").trim() || null,
      expected_entries: Number(formData.get("expectedEntries") || 0) || null,
      staging_sections: Number(formData.get("stagingSections") || 0) || null,
      status: String(formData.get("status") || "draft"),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}/parades/${eventId}`);
}

export async function deleteParade(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const organizationId = await getEventOrganizationId(eventId);

  await requireOrganizationCapability(
    organizationId,
    "deleteEvents",
    `/organizations/${slug}/parades/${eventId}`
  );

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}`);
}
