"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function updateStagingSpot(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const spotId = String(formData.get("spotId") || "");

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
