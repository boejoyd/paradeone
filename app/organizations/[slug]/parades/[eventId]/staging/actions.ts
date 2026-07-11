"use server";

import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UpdateStagingSpotPositionInput = {
  eventId: string;
  spotId: string;
  latitude: number;
  longitude: number;
};

type UpdateStagingSpotPositionResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; error: string };

function coordinatesAreValid(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function updateStagingSpotPosition(
  input: UpdateStagingSpotPositionInput
): Promise<UpdateStagingSpotPositionResult> {
  if (!input.eventId || !input.spotId) {
    return { ok: false, error: "Staging spot not found." };
  }

  if (!coordinatesAreValid(input.latitude, input.longitude)) {
    return { ok: false, error: "The selected map coordinates are invalid." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", input.eventId)
    .single();

  if (eventError || !event?.organization_id) {
    return { ok: false, error: eventError?.message || "Parade not found." };
  }

  await requireOrganizationRole(event.organization_id, ["owner", "admin", "staff"]);

  const { data: spot, error } = await supabase
    .from("staging_spots")
    .update({ latitude: input.latitude, longitude: input.longitude })
    .eq("id", input.spotId)
    .eq("event_id", input.eventId)
    .select("latitude, longitude")
    .maybeSingle();

  if (error || !spot || spot.latitude === null || spot.longitude === null) {
    return { ok: false, error: error?.message || "Unable to save the staging spot location." };
  }

  return { ok: true, latitude: spot.latitude, longitude: spot.longitude };
}
