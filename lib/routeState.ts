import type { SupabaseClient } from "@supabase/supabase-js";

export const ROUTE_STATES = ["staged", "pushed_off", "approaching_start", "on_route", "approaching_finish", "completed"] as const;
export type RouteState = (typeof ROUTE_STATES)[number];

const stateRank = new Map<RouteState, number>(ROUTE_STATES.map((state, index) => [state, index]));
const REQUIRED_READING_COUNT = 3;
const CONFIRMATION_WINDOW_MS = 8_000;
export const MAX_ROUTE_GPS_ACCURACY_METERS = 50;
const FEET_PER_METER = 3.28084;

type Point = { latitude: number; longitude: number };
type Checkpoint = Point & { checkpoint_type: string; geofence_radius_feet: number };
export type OperationalCheckpoint = Checkpoint & { id?: string; name: string };
type EntryRouteSnapshot = {
  id: string; event_id: string; pushed_off_at: string | null; route_state: RouteState;
  route_candidate_state: RouteState | null; route_candidate_count: number; route_candidate_since: string | null;
  finish_confirmed_at: string | null;
};

function distanceFeet(a: Point, b: Point) {
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLatitude = radians(b.latitude - a.latitude);
  const deltaLongitude = radians(b.longitude - a.longitude);
  const value = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * FEET_PER_METER;
}

export function findActiveOperationalCheckpoints(
  point: Point,
  checkpoints: OperationalCheckpoint[]
) {
  return checkpoints.filter(
    (checkpoint) =>
      checkpoint.checkpoint_type === "intermediate" &&
      distanceFeet(point, checkpoint) <= checkpoint.geofence_radius_feet
  );
}

function pointToSegmentFeet(point: Point, start: Point, end: Point) {
  const referenceLatitude = point.latitude * Math.PI / 180;
  const x = (longitude: number) => longitude * Math.PI / 180 * Math.cos(referenceLatitude) * 6_371_000;
  const y = (latitude: number) => latitude * Math.PI / 180 * 6_371_000;
  const px = x(point.longitude); const py = y(point.latitude);
  const ax = x(start.longitude); const ay = y(start.latitude);
  const bx = x(end.longitude); const by = y(end.latitude);
  const dx = bx - ax; const dy = by - ay;
  const divisor = dx * dx + dy * dy;
  const t = divisor === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / divisor));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * FEET_PER_METER;
}

function routeCoordinates(geometry: unknown): Point[] {
  if (!geometry || typeof geometry !== "object") return [];
  const candidate = geometry as { type?: unknown; coordinates?: unknown; geometry?: { type?: unknown; coordinates?: unknown } };
  const source = candidate.type === "Feature" ? candidate.geometry : candidate;
  if (source?.type !== "LineString" || !Array.isArray(source.coordinates)) return [];
  return source.coordinates.flatMap((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2 && Number.isFinite(Number(coordinate[0])) && Number.isFinite(Number(coordinate[1])) ? [{ longitude: Number(coordinate[0]), latitude: Number(coordinate[1]) }] : []);
}

function insideCorridor(point: Point, geometry: unknown, widthFeet: number) {
  const coordinates = routeCoordinates(geometry);
  if (coordinates.length < 2) return false;
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coordinates.length; index += 1) minimum = Math.min(minimum, pointToSegmentFeet(point, coordinates[index - 1], coordinates[index]));
  return minimum <= widthFeet / 2;
}

function timestampColumn(state: RouteState) {
  if (state === "approaching_start") return "approaching_start_at";
  if (state === "on_route") return "on_route_at";
  if (state === "approaching_finish") return "approaching_finish_at";
  if (state === "completed") return "route_completed_at";
  return null;
}

export async function evaluateRouteStateForLocation(input: { supabase: SupabaseClient; entry: EntryRouteSnapshot; latitude: number; longitude: number; accuracyMeters: number; observedAt: string }) {
  const { entry, supabase } = input;
  if (!entry.pushed_off_at || input.accuracyMeters > MAX_ROUTE_GPS_ACCURACY_METERS || entry.route_state === "staged" || entry.route_state === "completed") return entry.route_state;
  const [{ data: route }, { data: checkpoints }] = await Promise.all([
    supabase.from("parade_routes").select("route_geometry, corridor_width_feet").eq("event_id", entry.event_id).maybeSingle(),
    supabase.from("route_checkpoints").select("checkpoint_type, latitude, longitude, geofence_radius_feet").eq("event_id", entry.event_id),
  ]);
  const start = checkpoints?.find((item) => item.checkpoint_type === "route_start") as Checkpoint | undefined;
  const finish = checkpoints?.find((item) => item.checkpoint_type === "route_finish") as Checkpoint | undefined;
  const exit = checkpoints?.find((item) => item.checkpoint_type === "dispersal_exit") as Checkpoint | undefined;
  if (!route || !start || !finish || !exit) return entry.route_state;
  const point = { latitude: input.latitude, longitude: input.longitude };
  const approachRadius = (checkpoint: Checkpoint) => Math.max(checkpoint.geofence_radius_feet * 2, checkpoint.geofence_radius_feet + 150);
  let candidate: RouteState | null = null;
  if (entry.route_state === "pushed_off" && distanceFeet(point, start) <= approachRadius(start)) candidate = "approaching_start";
  if (entry.route_state === "approaching_start" && distanceFeet(point, start) <= start.geofence_radius_feet && insideCorridor(point, route.route_geometry, route.corridor_width_feet)) candidate = "on_route";
  if (entry.route_state === "on_route" && distanceFeet(point, finish) <= approachRadius(finish)) candidate = "approaching_finish";
  if (entry.route_state === "approaching_finish" && !entry.finish_confirmed_at) {
    if (distanceFeet(point, finish) > finish.geofence_radius_feet) {
      if (entry.route_candidate_state) await supabase.from("entries").update({ route_candidate_state: null, route_candidate_count: 0, route_candidate_since: null }).eq("id", entry.id).eq("event_id", entry.event_id).eq("route_state", entry.route_state);
      return entry.route_state;
    }
    const sameFinishCandidate = entry.route_candidate_state === "approaching_finish";
    const finishCount = sameFinishCandidate ? entry.route_candidate_count + 1 : 1;
    const finishSince = sameFinishCandidate && entry.route_candidate_since ? entry.route_candidate_since : input.observedAt;
    const finishConfirmed = finishCount >= REQUIRED_READING_COUNT && new Date(input.observedAt).getTime() - new Date(finishSince).getTime() >= CONFIRMATION_WINDOW_MS;
    await supabase.from("entries").update(finishConfirmed
      ? { finish_confirmed_at: input.observedAt, route_candidate_state: null, route_candidate_count: 0, route_candidate_since: null }
      : { route_candidate_state: "approaching_finish", route_candidate_count: finishCount, route_candidate_since: finishSince })
      .eq("id", entry.id).eq("event_id", entry.event_id).eq("route_state", entry.route_state);
    return entry.route_state;
  }
  if (entry.route_state === "approaching_finish" && entry.finish_confirmed_at && distanceFeet(point, exit) <= exit.geofence_radius_feet) candidate = "completed";

  if (!candidate || (stateRank.get(candidate) ?? 0) <= (stateRank.get(entry.route_state) ?? 0)) {
    if (entry.route_candidate_state) await supabase.from("entries").update({ route_candidate_state: null, route_candidate_count: 0, route_candidate_since: null }).eq("id", entry.id).eq("event_id", entry.event_id).eq("route_state", entry.route_state);
    return entry.route_state;
  }
  const sameCandidate = entry.route_candidate_state === candidate;
  const count = sameCandidate ? entry.route_candidate_count + 1 : 1;
  const since = sameCandidate && entry.route_candidate_since ? entry.route_candidate_since : input.observedAt;
  const confirmed = count >= REQUIRED_READING_COUNT && new Date(input.observedAt).getTime() - new Date(since).getTime() >= CONFIRMATION_WINDOW_MS;
  if (!confirmed) {
    await supabase.from("entries").update({ route_candidate_state: candidate, route_candidate_count: count, route_candidate_since: since }).eq("id", entry.id).eq("event_id", entry.event_id).eq("route_state", entry.route_state);
    return entry.route_state;
  }
  const timestamp = timestampColumn(candidate);
  const update: Record<string, unknown> = { route_state: candidate, route_state_updated_at: input.observedAt, route_candidate_state: null, route_candidate_count: 0, route_candidate_since: null };
  if (timestamp) update[timestamp] = input.observedAt;
  const { data: advanced } = await supabase.from("entries").update(update).eq("id", entry.id).eq("event_id", entry.event_id).eq("route_state", entry.route_state).select("id").maybeSingle();
  if (!advanced) return entry.route_state;
  await supabase.from("entry_route_state_events").insert({ event_id: entry.event_id, entry_id: entry.id, from_state: entry.route_state, to_state: candidate, transition_source: "automatic", latitude: input.latitude, longitude: input.longitude, accuracy_meters: input.accuracyMeters });
  return candidate;
}
