import { getUserOrganizationIds, requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findActiveOperationalCheckpoints, type OperationalCheckpoint } from "@/lib/routeState";

export type MissionControlRouteCheckpoint = OperationalCheckpoint & {
  id: string;
  sort_order: number;
};

export type MissionControlMapSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  entries?: {
    id: string;
    name: string;
    parade_number: number | null;
    check_in_status: string | null;
    pushed_off_at: string | null;
    route_state: string;
    gps_lat: number | null;
    gps_lng: number | null;
    on_route_at: string | null;
    active_checkpoint_names: string[];
  }[] | null;
};

export type MissionControlMapData = {
  spots: MissionControlMapSpot[];
  routeGeometry?: unknown;
  routeCheckpoints?: MissionControlRouteCheckpoint[];
  editBasePath?: string;
  organizationName?: string;
  eventName?: string;
  organizationId?: string;
  eventId?: string;
  hasOrganizationMembership: boolean;
};

export async function getMissionControlMapData(): Promise<MissionControlMapData> {
  const user = await requireUser();
  const organizationIds = await getUserOrganizationIds(user.id);

  if (organizationIds.length === 0) {
    return {
      spots: [],
      hasOrganizationMembership: false,
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data: eventRow } = await supabase
    .from("events")
    .select("id, name, organization_id, organizations(name, slug)")
    .in("organization_id", organizationIds)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!eventRow?.id) {
    return {
      spots: [],
      hasOrganizationMembership: true,
    };
  }

  const [{ data: spots, error }, { data: route }, { data: checkpoints }] = await Promise.all([
    supabase
      .from("staging_spots")
      .select(
        "id, spot_code, section, street_name, latitude, longitude, geofence_radius_feet, reserved_length_feet, entries(id, name, parade_number, check_in_status, pushed_off_at, route_state, gps_lat, gps_lng, on_route_at)"
      )
      .eq("event_id", eventRow.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("spot_code", { ascending: true }),
    supabase.from("parade_routes").select("route_geometry").eq("event_id", eventRow.id).maybeSingle(),
    supabase
      .from("route_checkpoints")
      .select("id, name, checkpoint_type, latitude, longitude, geofence_radius_feet, sort_order")
      .eq("event_id", eventRow.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const org = Array.isArray(eventRow.organizations)
    ? eventRow.organizations[0]
    : eventRow.organizations;

  const routeCheckpoints = (checkpoints ?? []) as MissionControlRouteCheckpoint[];
  const enhancedSpots = (spots ?? []).map((spot) => ({
    ...spot,
    entries: Array.isArray(spot.entries)
      ? spot.entries.map((entry) => ({
          ...entry,
          active_checkpoint_names:
            typeof entry.gps_lat === "number" && typeof entry.gps_lng === "number"
              ? findActiveOperationalCheckpoints(
                  { latitude: entry.gps_lat, longitude: entry.gps_lng },
                  routeCheckpoints
                ).map((checkpoint) => checkpoint.name)
              : [],
        }))
      : [],
  })) as MissionControlMapSpot[];

  return {
    spots: enhancedSpots,
    routeGeometry: route?.route_geometry ?? null,
    routeCheckpoints,
    editBasePath:
      org?.slug
        ? `/organizations/${org.slug}/parades/${eventRow.id}/staging`
        : undefined,
    organizationName: org?.name,
    eventName: eventRow.name,
    organizationId: eventRow.organization_id,
    eventId: eventRow.id,
    hasOrganizationMembership: true,
  };
}
