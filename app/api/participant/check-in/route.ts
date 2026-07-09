import { NextResponse } from "next/server";

import { getParticipantTokenPayload } from "@/lib/participantToken";
import { supabase } from "@/lib/supabase";

type CheckInRequest = {
  token?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type CoordinateRow = {
  id: string;
  event_id: string;
  staging_spot_id: string | null;
  check_in_status: string | null;
  checked_in_at: string | null;
  staging_spots?:
    | {
        latitude: number | null;
        longitude: number | null;
        geofence_radius_feet: number | null;
      }
    | {
        latitude: number | null;
        longitude: number | null;
        geofence_radius_feet: number | null;
      }[]
    | null;
};

function parseCoordinate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceInFeet(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const radiansLatitudeA = toRadians(latitudeA);
  const radiansLatitudeB = toRadians(latitudeB);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(radiansLatitudeA) *
      Math.cos(radiansLatitudeB) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = earthRadiusMeters * c;
  return meters * 3.28084;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as CheckInRequest | null;
  const token = String(payload?.token || "").trim();
  const latitude = parseCoordinate(payload?.latitude);
  const longitude = parseCoordinate(payload?.longitude);

  if (!token || latitude === null || longitude === null) {
    return NextResponse.json(
      { ok: false, error: "Token, latitude, and longitude are required." },
      { status: 400 }
    );
  }

  const participantToken = await getParticipantTokenPayload(token);
  if (!participantToken) {
    return NextResponse.json({ ok: false, error: "Invalid participant token." }, { status: 401 });
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select(
      "id, event_id, staging_spot_id, check_in_status, checked_in_at, staging_spots(latitude, longitude, geofence_radius_feet)"
    )
    .eq("id", participantToken.entryId)
    .single();

  if (entryError || !entry || entry.event_id !== participantToken.eventId) {
    return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
  }

  const typedEntry = entry as unknown as CoordinateRow;
  const stagingSpot = Array.isArray(typedEntry.staging_spots)
    ? typedEntry.staging_spots[0]
    : typedEntry.staging_spots;

  if (
    !stagingSpot ||
    typeof stagingSpot.latitude !== "number" ||
    typeof stagingSpot.longitude !== "number"
  ) {
    return NextResponse.json(
      { ok: false, error: "Check-in location is not available yet." },
      { status: 400 }
    );
  }

  const radiusFeet =
    typeof stagingSpot.geofence_radius_feet === "number"
      ? stagingSpot.geofence_radius_feet
      : 150;
  const distanceFeet = distanceInFeet(
    latitude,
    longitude,
    stagingSpot.latitude,
    stagingSpot.longitude
  );

  if (distanceFeet > radiusFeet) {
    return NextResponse.json(
      {
        ok: false,
        error: "You are not at your assigned staging location yet.",
        distanceFeet,
        radiusFeet,
      },
      { status: 403 }
    );
  }

  const checkedInAt = new Date().toISOString();

  const { error: checkInError } = await supabase.from("check_ins").insert({
    entry_id: typedEntry.id,
    event_id: typedEntry.event_id,
    staging_spot_id: typedEntry.staging_spot_id,
    checked_in_at: checkedInAt,
    latitude,
    longitude,
    distance_from_spot_feet: distanceFeet,
    method: "participant_check_in",
  });

  if (checkInError) {
    return NextResponse.json({ ok: false, error: checkInError.message }, { status: 500 });
  }

  const { error: entryUpdateError } = await supabase
    .from("entries")
    .update({
      check_in_status: "checked_in",
      checked_in_at: checkedInAt,
      gps_lat: latitude,
      gps_lng: longitude,
    })
    .eq("id", typedEntry.id)
    .eq("event_id", typedEntry.event_id);

  if (entryUpdateError) {
    return NextResponse.json({ ok: false, error: entryUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    checkedInAt,
    distanceFeet,
    radiusFeet,
  });
}
