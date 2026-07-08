import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MissionControlOperationalStatus =
  | "ready"
  | "getting_ready"
  | "needs_assistance"
  | "not_checked_in";

type UpdateMissionControlStatusRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  entryNumber?: unknown;
  status?: unknown;
};

function parseOperationalStatus(value: unknown): MissionControlOperationalStatus | null {
  return value === "ready" ||
    value === "getting_ready" ||
    value === "needs_assistance" ||
    value === "not_checked_in"
    ? value
    : null;
}

function parseEntryNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.trunc(parsed);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | UpdateMissionControlStatusRequest
    | null;

  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const entryNumber = parseEntryNumber(payload?.entryNumber);
  const status = parseOperationalStatus(payload?.status);

  if (!organizationId || !eventId || !entryNumber || !status) {
    return NextResponse.json(
      { ok: false, error: "Organization, event, entry number, and status are required." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select("id")
    .eq("event_id", eventId)
    .eq("parade_number", entryNumber)
    .maybeSingle();

  if (entryError || !entry) {
    return NextResponse.json({ ok: false, error: "Entry not found for that number." }, { status: 404 });
  }

  const updatePayload: {
    check_in_status: MissionControlOperationalStatus;
    checked_in_at?: string | null;
  } = {
    check_in_status: status,
  };

  if (status === "ready") {
    updatePayload.checked_in_at = new Date().toISOString();
  }

  if (status === "not_checked_in") {
    updatePayload.checked_in_at = null;
  }

  const { error: updateError } = await supabase
    .from("entries")
    .update(updatePayload)
    .eq("id", entry.id)
    .eq("event_id", eventId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status,
    entryNumber,
  });
}
