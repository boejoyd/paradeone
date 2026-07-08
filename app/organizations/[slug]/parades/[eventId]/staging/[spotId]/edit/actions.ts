"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateStagingSpot(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const spotId = String(formData.get("spotId") || "");
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
    .from("staging_spots")
    .update({
      spot_code: String(formData.get("spotCode") || "").trim(),
      section: String(formData.get("section") || "").trim() || null,
      street_name: String(formData.get("streetName") || "").trim() || null,
      latitude: Number(formData.get("latitude") || 0) || null,
      longitude: Number(formData.get("longitude") || 0) || null,
      geofence_radius_feet: Number(formData.get("geofenceRadiusFeet") || 125) || 125,
      reserved_length_feet: Number(formData.get("reservedLengthFeet") || 0) || null,
      reserved_width_feet: Number(formData.get("reservedWidthFeet") || 0) || null,
      sort_order: Number(formData.get("sortOrder") || 0) || null,
    })
    .eq("id", spotId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}/parades/${eventId}/staging`);
}
export async function deleteStagingSpot(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const spotId = String(formData.get("spotId") || "");
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
    .from("staging_spots")
    .delete()
    .eq("id", spotId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}/parades/${eventId}/staging`);
}
