import { NextResponse } from "next/server";

import { getParticipantTokenPayload } from "@/lib/participantToken";
import { supabase } from "@/lib/supabase";
import { evaluateRouteStateForLocation, MAX_ROUTE_GPS_ACCURACY_METERS, type RouteState } from "@/lib/routeState";

type LocationUpdateRequest = {
  token?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
};

function parseCoordinate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as LocationUpdateRequest | null;
  const token = String(payload?.token || "").trim();
  const latitude = parseCoordinate(payload?.latitude);
  const longitude = parseCoordinate(payload?.longitude);
  const accuracy = parseCoordinate(payload?.accuracy);

  if (!token || latitude === null || longitude === null || accuracy === null || accuracy < 0) {
    return NextResponse.json(
      { ok: false, error: "Token, latitude, longitude, and GPS accuracy are required." },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { ok: false, error: "Invalid coordinate range." },
      { status: 400 }
    );
  }

  const participantToken = await getParticipantTokenPayload(token);
  if (!participantToken) {
    return NextResponse.json({ ok: false, error: "Invalid participant token." }, { status: 401 });
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select("id, event_id, staging_spot_id, pushed_off_at, route_state, route_completed_at, route_candidate_state, route_candidate_count, route_candidate_since, finish_confirmed_at")
    .eq("id", participantToken.entryId)
    .single();

  if (entryError || !entry || entry.event_id !== participantToken.eventId) {
    return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
  }

  const updatedAt = new Date().toISOString();

  const { error: locationError } = await supabase.from("check_ins").insert({
    entry_id: entry.id,
    event_id: entry.event_id,
    staging_spot_id: entry.staging_spot_id,
    latitude,
    longitude,
    method: "participant_live",
    accuracy_meters: accuracy,
    checked_in_at: updatedAt,
  });

  if (locationError) {
    return NextResponse.json({ ok: false, error: locationError.message }, { status: 500 });
  }

  const { error: entryUpdateError } = await supabase
    .from("entries")
    .update({
      gps_lat: latitude,
      gps_lng: longitude,
    })
    .eq("id", entry.id)
    .eq("event_id", entry.event_id);

  if (entryUpdateError) {
    return NextResponse.json({ ok: false, error: entryUpdateError.message }, { status: 500 });
  }

  if (entry.route_state === "completed") {
    return NextResponse.json({ ok: true, routeState: "completed", routeCompletedAt: entry.route_completed_at, readingQualified: false });
  }

  let routeState = entry.route_state as RouteState;
  if (accuracy <= MAX_ROUTE_GPS_ACCURACY_METERS) {
    routeState = await evaluateRouteStateForLocation({
      supabase,
      entry: {
        ...entry,
        route_state: routeState,
        route_candidate_state: entry.route_candidate_state as RouteState | null,
      },
      latitude,
      longitude,
      accuracyMeters: accuracy,
      observedAt: updatedAt,
    });
  }

  const { data: durableState } = await supabase.from("entries").select("route_state, route_completed_at").eq("id", entry.id).eq("event_id", entry.event_id).single();
  return NextResponse.json({ ok: true, updatedAt, routeState: durableState?.route_state || routeState, routeCompletedAt: durableState?.route_completed_at || null, readingQualified: accuracy <= MAX_ROUTE_GPS_ACCURACY_METERS });
}
