import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ParadeUnit,
  ParadeUnitCheckInStatus,
  ParadeUnitCreateInput,
  ParadeUnitGpsStatus,
  ParadeUnitUpdateInput,
} from "./types";

const PARADE_UNIT_SELECT = `
  id,
  event_id,
  organization_id,
  entry_number,
  name,
  unit_type,
  category,
  captain_name,
  captain_email,
  captain_phone,
  driver_name,
  driver_phone,
  vehicle_description,
  check_in_status,
  gps_status,
  staging_location,
  lineup_position,
  announcer_script,
  notes,
  created_at,
  updated_at
`;

const CHECK_IN_STATUSES: readonly ParadeUnitCheckInStatus[] = [
  "not_checked_in",
  "checked_in",
  "staged",
  "rolling",
  "completed",
  "issue",
];

const GPS_STATUSES: readonly ParadeUnitGpsStatus[] = [
  "not_enabled",
  "waiting",
  "active",
  "stale",
  "lost",
];

function assertCheckInStatus(value: string): asserts value is ParadeUnitCheckInStatus {
  if (!CHECK_IN_STATUSES.includes(value as ParadeUnitCheckInStatus)) {
    throw new Error(`Invalid check_in_status: ${value}`);
  }
}

function assertGpsStatus(value: string): asserts value is ParadeUnitGpsStatus {
  if (!GPS_STATUSES.includes(value as ParadeUnitGpsStatus)) {
    throw new Error(`Invalid gps_status: ${value}`);
  }
}

function sanitizeText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listParadeUnits(eventId: string): Promise<ParadeUnit[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("parade_units")
    .select(PARADE_UNIT_SELECT)
    .eq("event_id", eventId)
    .order("lineup_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ParadeUnit[];
}

export async function getParadeUnit(unitId: string): Promise<ParadeUnit | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("parade_units")
    .select(PARADE_UNIT_SELECT)
    .eq("id", unitId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ParadeUnit | null) ?? null;
}

export async function createParadeUnit(
  input: ParadeUnitCreateInput
): Promise<ParadeUnit> {
  const supabase = await createServerSupabaseClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Parade unit name is required.");
  }

  if (input.check_in_status) {
    assertCheckInStatus(input.check_in_status);
  }

  if (input.gps_status) {
    assertGpsStatus(input.gps_status);
  }

  const payload = {
    event_id: input.event_id,
    organization_id: input.organization_id,
    entry_number: input.entry_number ?? null,
    name,
    unit_type: sanitizeText(input.unit_type) ?? "float",
    category: sanitizeText(input.category),
    captain_name: sanitizeText(input.captain_name),
    captain_email: sanitizeText(input.captain_email),
    captain_phone: sanitizeText(input.captain_phone),
    driver_name: sanitizeText(input.driver_name),
    driver_phone: sanitizeText(input.driver_phone),
    vehicle_description: sanitizeText(input.vehicle_description),
    check_in_status: input.check_in_status ?? "not_checked_in",
    gps_status: input.gps_status ?? "not_enabled",
    staging_location: sanitizeText(input.staging_location),
    lineup_position: input.lineup_position ?? null,
    announcer_script: sanitizeText(input.announcer_script),
    notes: sanitizeText(input.notes),
  };

  const { data, error } = await supabase
    .from("parade_units")
    .insert(payload)
    .select(PARADE_UNIT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ParadeUnit;
}

export async function updateParadeUnit(
  unitId: string,
  input: ParadeUnitUpdateInput
): Promise<ParadeUnit> {
  const supabase = await createServerSupabaseClient();
  const payload: Record<string, unknown> = {};

  if (input.event_id !== undefined) {
    payload.event_id = input.event_id;
  }

  if (input.organization_id !== undefined) {
    payload.organization_id = input.organization_id;
  }

  if (input.entry_number !== undefined) {
    payload.entry_number = input.entry_number;
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Parade unit name is required.");
    }
    payload.name = name;
  }

  if (input.unit_type !== undefined) {
    payload.unit_type = sanitizeText(input.unit_type) ?? "float";
  }

  if (input.category !== undefined) {
    payload.category = sanitizeText(input.category);
  }

  if (input.captain_name !== undefined) {
    payload.captain_name = sanitizeText(input.captain_name);
  }

  if (input.captain_email !== undefined) {
    payload.captain_email = sanitizeText(input.captain_email);
  }

  if (input.captain_phone !== undefined) {
    payload.captain_phone = sanitizeText(input.captain_phone);
  }

  if (input.driver_name !== undefined) {
    payload.driver_name = sanitizeText(input.driver_name);
  }

  if (input.driver_phone !== undefined) {
    payload.driver_phone = sanitizeText(input.driver_phone);
  }

  if (input.vehicle_description !== undefined) {
    payload.vehicle_description = sanitizeText(input.vehicle_description);
  }

  if (input.check_in_status !== undefined) {
    assertCheckInStatus(input.check_in_status);
    payload.check_in_status = input.check_in_status;
  }

  if (input.gps_status !== undefined) {
    assertGpsStatus(input.gps_status);
    payload.gps_status = input.gps_status;
  }

  if (input.staging_location !== undefined) {
    payload.staging_location = sanitizeText(input.staging_location);
  }

  if (input.lineup_position !== undefined) {
    payload.lineup_position = input.lineup_position;
  }

  if (input.announcer_script !== undefined) {
    payload.announcer_script = sanitizeText(input.announcer_script);
  }

  if (input.notes !== undefined) {
    payload.notes = sanitizeText(input.notes);
  }

  const { data, error } = await supabase
    .from("parade_units")
    .update(payload)
    .eq("id", unitId)
    .select(PARADE_UNIT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ParadeUnit;
}
