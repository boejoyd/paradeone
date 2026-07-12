import { NextResponse } from "next/server";

import { getParticipantTokenPayload } from "@/lib/participantToken";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  const participantToken = await getParticipantTokenPayload(token);

  if (!participantToken) {
    return NextResponse.json({ ok: false, error: "Invalid participant token." }, { status: 401 });
  }

  const { data: entry, error } = await supabase
    .from("entries")
    .select("id, event_id, route_state, route_completed_at")
    .eq("id", participantToken.entryId)
    .eq("event_id", participantToken.eventId)
    .maybeSingle();

  if (error || !entry || entry.event_id !== participantToken.eventId) {
    return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    routeState: entry.route_state,
    routeCompletedAt: entry.route_completed_at,
  });
}
