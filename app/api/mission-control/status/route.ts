import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MissionControlOperationalStatus =
  | "ready"
  | "getting_ready"
  | "needs_assistance"
  | "not_checked_in";
type RouteState = "staged" | "pushed_off" | "approaching_start" | "on_route" | "approaching_finish" | "completed";
type MissionControlStatus = MissionControlOperationalStatus | RouteState;

type UpdateMissionControlStatusRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  entryId?: unknown;
  entryNumber?: unknown;
  status?: unknown;
};

type LiveStatusEntry = {
  id: string;
  paradeNumber: number | null;
  checkInStatus: string | null;
  checkedInAt: string | null;
  pushedOffAt: string | null;
  routeState: RouteState;
};

function parseOperationalStatus(value: unknown): MissionControlOperationalStatus | null {
  return value === "ready" ||
    value === "getting_ready" ||
    value === "needs_assistance" ||
    value === "not_checked_in"
    ? value
    : null;
}

function parseRouteState(value: unknown): RouteState | null {
  return value === "staged" || value === "pushed_off" || value === "approaching_start" || value === "on_route" || value === "approaching_finish" || value === "completed" ? value : null;
}

function parseEntryNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.trunc(parsed);
}

async function validateMissionControlContext(organizationId: string, eventId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 }) };
  }

  return {
    supabase,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() || "";
  const eventId = url.searchParams.get("eventId")?.trim() || "";

  if (!organizationId || !eventId) {
    return NextResponse.json(
      { ok: false, error: "Organization and event are required." },
      { status: 400 }
    );
  }

  const context = await validateMissionControlContext(organizationId, eventId);
  if ("error" in context) {
    return context.error;
  }

  const { data: entries, error } = await context.supabase
    .from("entries")
    .select("id, parade_number, check_in_status, checked_in_at, pushed_off_at, route_state")
    .eq("event_id", eventId)
    .order("parade_number", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const statuses: LiveStatusEntry[] = (entries ?? []).map((entry) => ({
    id: entry.id,
    paradeNumber: entry.parade_number,
    checkInStatus: entry.route_state !== "staged" ? entry.route_state : entry.pushed_off_at ? "pushed_off" : entry.check_in_status,
    checkedInAt: entry.checked_in_at,
    pushedOffAt: entry.pushed_off_at,
    routeState: entry.route_state as RouteState,
  }));

  return NextResponse.json({ ok: true, statuses });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | UpdateMissionControlStatusRequest
    | null;

  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const entryId = String(payload?.entryId || "").trim();
  const entryNumber = parseEntryNumber(payload?.entryNumber);
  const operationalStatus = parseOperationalStatus(payload?.status);
  const routeState = parseRouteState(payload?.status);
  const status: MissionControlStatus | null = routeState || operationalStatus;

  if (!organizationId || !eventId || (!entryId && !entryNumber) || !status) {
    return NextResponse.json(
      { ok: false, error: "Organization, event, entry, and status are required." },
      { status: 400 }
    );
  }

  const context = await validateMissionControlContext(organizationId, eventId);
  if ("error" in context) {
    return context.error;
  }

  const supabase = context.supabase;

  let entryQuery = supabase
    .from("entries")
    .select("id, parade_number")
    .eq("event_id", eventId);

  entryQuery = entryId
    ? entryQuery.eq("id", entryId)
    : entryQuery.eq("parade_number", entryNumber!);

  const { data: entry, error: entryError } = await entryQuery.maybeSingle();

  if (entryError || !entry) {
    return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
  }

  const updatePayload: {
    check_in_status?: MissionControlOperationalStatus;
    checked_in_at?: string | null;
    route_state?: RouteState;
    route_state_updated_at?: string;
    route_state_manual_override_at?: string;
    route_candidate_state?: null;
    route_candidate_count?: number;
    route_candidate_since?: null;
    pushed_off_at?: string | null;
    approaching_start_at?: string | null;
    on_route_at?: string | null;
    approaching_finish_at?: string | null;
    route_completed_at?: string | null;
  } = {
  };

  const now = new Date().toISOString();

  if (routeState) {
    updatePayload.route_state = routeState;
    updatePayload.route_state_updated_at = now;
    updatePayload.route_state_manual_override_at = now;
    updatePayload.route_candidate_state = null;
    updatePayload.route_candidate_count = 0;
    updatePayload.route_candidate_since = null;
    if (routeState === "pushed_off") updatePayload.pushed_off_at = now;
    if (routeState === "approaching_start") updatePayload.approaching_start_at = now;
    if (routeState === "on_route") updatePayload.on_route_at = now;
    if (routeState === "approaching_finish") updatePayload.approaching_finish_at = now;
    if (routeState === "completed") updatePayload.route_completed_at = now;
  } else if (operationalStatus) {
    updatePayload.check_in_status = operationalStatus;
    updatePayload.route_state = "staged";
    updatePayload.route_state_updated_at = now;
    updatePayload.route_state_manual_override_at = now;
    updatePayload.route_candidate_state = null;
    updatePayload.route_candidate_count = 0;
    updatePayload.route_candidate_since = null;
    updatePayload.pushed_off_at = null;
    updatePayload.approaching_start_at = null;
    updatePayload.on_route_at = null;
    updatePayload.approaching_finish_at = null;
    updatePayload.route_completed_at = null;
  }

  if (operationalStatus === "ready") {
    updatePayload.checked_in_at = now;
  }

  if (operationalStatus === "not_checked_in") {
    updatePayload.checked_in_at = null;
  }

  const { data: currentEntry } = await supabase.from("entries").select("route_state").eq("id", entry.id).eq("event_id", eventId).single();
  const { error: updateError } = await supabase
    .from("entries")
    .update(updatePayload)
    .eq("id", entry.id)
    .eq("event_id", eventId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  const nextRouteState = routeState ?? (operationalStatus ? "staged" : null);
  if (nextRouteState && currentEntry?.route_state !== nextRouteState) {
    await supabase.from("entry_route_state_events").insert({
      event_id: eventId,
      entry_id: entry.id,
      from_state: currentEntry?.route_state || null,
      to_state: nextRouteState,
      transition_source: "manual",
    });
  }

  return NextResponse.json({
    ok: true,
    entryId: entry.id,
    status,
    entryNumber: entry.parade_number,
  });
}
