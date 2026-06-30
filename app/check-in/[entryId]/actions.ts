"use server";

import { supabase } from "@/lib/supabase";

export async function saveCheckIn(input: {
  entryId: string;
  latitude: number;
  longitude: number;
  distanceFromSpotFeet: number;
}) {
  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select("id, event_id, staging_spot_id")
    .eq("id", input.entryId)
    .single();

  if (entryError) throw new Error(entryError.message);

  const { error: checkInError } = await supabase.from("check_ins").insert({
    entry_id: entry.id,
    event_id: entry.event_id,
    staging_spot_id: entry.staging_spot_id,
    latitude: input.latitude,
    longitude: input.longitude,
    distance_from_spot_feet: input.distanceFromSpotFeet,
    method: "self",
  });

  if (checkInError) throw new Error(checkInError.message);

  const { error: entryUpdateError } = await supabase
    .from("entries")
    .update({
      check_in_status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", input.entryId);

  if (entryUpdateError) throw new Error(entryUpdateError.message);

  return { success: true };
}
