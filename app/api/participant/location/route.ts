import { NextResponse } from "next/server";

import { getParticipantTokenPayload } from "@/lib/participantToken";
import { supabase } from "@/lib/supabase";

type LocationUpdateRequest = {
  token?: unknown;
  latitude?: unknown;
  longitude?: unknown;
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

  if (!token || latitude === null || longitude === null) {
    return NextResponse.json(
      { ok: false, error: "Token, latitude, and longitude are required." },
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
    .select("id, event_id, staging_spot_id")
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

  return NextResponse.json({ ok: true, updatedAt });
}
