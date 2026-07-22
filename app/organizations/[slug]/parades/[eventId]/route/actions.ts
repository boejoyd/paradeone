"use server";

import { requireOrganizationCapability } from "@/lib/organizations/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CheckpointType = "route_start" | "intermediate" | "route_finish" | "dispersal_exit";
const checkpointTypes = new Set<CheckpointType>(["route_start", "intermediate", "route_finish", "dispersal_exit"]);

async function authorizedClient(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: event, error } = await supabase.from("events").select("organization_id").eq("id", eventId).single();
  if (error || !event) throw new Error(error?.message || "Parade not found.");
  await requireOrganizationCapability(event.organization_id, "manageRoutes");
  return supabase;
}

type RouteGeometry = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

function parseRouteGeometry(value: unknown): RouteGeometry | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { type?: unknown; properties?: unknown; geometry?: { type?: unknown; coordinates?: unknown } };
  if (candidate.type !== "Feature" || candidate.geometry?.type !== "LineString" || !Array.isArray(candidate.geometry.coordinates)) return undefined;
  if (candidate.geometry.coordinates.length < 2 || candidate.geometry.coordinates.length > 5000) return undefined;
  const coordinates: [number, number][] = [];
  for (const coordinate of candidate.geometry.coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return undefined;
    const longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return undefined;
    coordinates.push([longitude, latitude]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } };
}

export async function saveRouteSettings(input: { eventId: string; corridorWidthFeet: number; routeGeometry: unknown }) {
  if (!Number.isInteger(input.corridorWidthFeet) || input.corridorWidthFeet < 1) return { ok: false as const, error: "Corridor width must be a positive whole number." };
  const routeGeometry = parseRouteGeometry(input.routeGeometry);
  if (routeGeometry === undefined) return { ok: false as const, error: "Draw a route with at least two valid map points." };
  try {
    const supabase = await authorizedClient(input.eventId);
    const { error } = await supabase.from("parade_routes").upsert({ event_id: input.eventId, corridor_width_feet: input.corridorWidthFeet, route_geometry: routeGeometry, updated_at: new Date().toISOString() }, { onConflict: "event_id" });
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

export async function deleteCheckpoint(input: { eventId: string; checkpointId: string }) {
  if (!input.checkpointId.trim()) {
    return { ok: false as const, error: "Checkpoint is required." };
  }

  try {
    const supabase = await authorizedClient(input.eventId);
    const { error } = await supabase
      .from("route_checkpoints")
      .delete()
      .eq("id", input.checkpointId)
      .eq("event_id", input.eventId);

    return error
      ? { ok: false as const, error: error.message }
      : { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to delete checkpoint.",
    };
  }
}
