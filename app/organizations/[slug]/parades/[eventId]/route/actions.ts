"use server";

import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CheckpointType = "route_start" | "intermediate" | "route_finish" | "dispersal_exit";
const checkpointTypes = new Set<CheckpointType>(["route_start", "intermediate", "route_finish", "dispersal_exit"]);

async function authorizedClient(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: event, error } = await supabase.from("events").select("organization_id").eq("id", eventId).single();
  if (error || !event) throw new Error(error?.message || "Parade not found.");
  await requireOrganizationRole(event.organization_id, ["owner", "admin", "staff"]);
  return supabase;
}

export async function saveRouteSettings(input: { eventId: string; corridorWidthFeet: number }) {
  if (!Number.isInteger(input.corridorWidthFeet) || input.corridorWidthFeet < 1) return { ok: false as const, error: "Corridor width must be a positive whole number." };
  try {
    const supabase = await authorizedClient(input.eventId);
    const { error } = await supabase.from("parade_routes").upsert({ event_id: input.eventId, corridor_width_feet: input.corridorWidthFeet, updated_at: new Date().toISOString() }, { onConflict: "event_id" });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Unable to save route settings." }; }
}

export async function saveCheckpoint(input: { eventId: string; checkpointId?: string; name: string; checkpointType: CheckpointType; latitude: number; longitude: number; geofenceRadiusFeet: number; sortOrder: number }) {
  if (!input.name.trim()) return { ok: false as const, error: "Checkpoint name is required." };
  if (!checkpointTypes.has(input.checkpointType)) return { ok: false as const, error: "Checkpoint type is invalid." };
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) return { ok: false as const, error: "Checkpoint coordinates are invalid." };
  if (!Number.isInteger(input.geofenceRadiusFeet) || input.geofenceRadiusFeet < 1 || !Number.isInteger(input.sortOrder)) return { ok: false as const, error: "Radius and sort order must be whole numbers." };
  try {
    const supabase = await authorizedClient(input.eventId);
    const values = { event_id: input.eventId, name: input.name.trim(), checkpoint_type: input.checkpointType, latitude: input.latitude, longitude: input.longitude, geofence_radius_feet: input.geofenceRadiusFeet, sort_order: input.sortOrder, updated_at: new Date().toISOString() };
    const query = input.checkpointId
      ? supabase.from("route_checkpoints").update(values).eq("id", input.checkpointId).eq("event_id", input.eventId)
      : supabase.from("route_checkpoints").insert(values);
    const { data, error } = await query.select("id, name, checkpoint_type, latitude, longitude, geofence_radius_feet, sort_order").single();
    return error || !data ? { ok: false as const, error: error?.message || "Unable to save checkpoint." } : { ok: true as const, checkpoint: data };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Unable to save checkpoint." }; }
}
