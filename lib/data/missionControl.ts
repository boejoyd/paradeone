import { getActiveParadeId } from "@/lib/activeParade.server";
import { getUserOrganizationIds, requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  }[] | null;
};

type MissionControlMapData = {
  spots: MissionControlMapSpot[];
  editBasePath?: string;
  organizationName?: string;
  eventName?: string;
  organizationId?: string;
  eventId?: string;
  hasOrganizationMembership: boolean;
  hasActiveParade: boolean;
};

export async function getMissionControlMapData(): Promise<MissionControlMapData> {
  const user = await requireUser();
  const organizationIds = await getUserOrganizationIds(user.id);

  if (organizationIds.length === 0) {
    return {
      spots: [],
      hasOrganizationMembership: false,
      hasActiveParade: false,
    };
  }

  const supabase = await createServerSupabaseClient();
  const activeParadeId = await getActiveParadeId();

  const { data: selectedEventRow } = activeParadeId
    ? await supabase
        .from("events")
        .select("id, name, organization_id, organizations(name, slug)")
        .in("organization_id", organizationIds)
        .eq("id", activeParadeId)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const eventRow = selectedEventRow;

  if (!eventRow?.id) {
    return {
      spots: [],
      hasOrganizationMembership: true,
      hasActiveParade: false,
    };
  }

  const { data: spots, error } = await supabase
    .from("staging_spots")
    .select(
      "id, spot_code, section, street_name, latitude, longitude, geofence_radius_feet, reserved_length_feet, entries(id, name, parade_number, check_in_status, pushed_off_at, route_state)"
    )
    .eq("event_id", eventRow.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("spot_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const org = Array.isArray(eventRow.organizations)
    ? eventRow.organizations[0]
    : eventRow.organizations;

  return {
    spots: (spots ?? []) as MissionControlMapSpot[],
    editBasePath:
      org?.slug
        ? `/organizations/${org.slug}/parades/${eventRow.id}/staging`
        : undefined,
    organizationName: org?.name,
    eventName: eventRow.name,
    organizationId: eventRow.organization_id,
    eventId: eventRow.id,
    hasOrganizationMembership: true,
    hasActiveParade: true,
  };
}
