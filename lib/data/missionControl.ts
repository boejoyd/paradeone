import { supabase } from "@/lib/supabase";

export type MissionControlMapSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  entries?: { name: string; check_in_status: string | null }[] | null;
};

type MissionControlMapData = {
  spots: MissionControlMapSpot[];
  editBasePath?: string;
  organizationName?: string;
  eventName?: string;
  organizationId?: string;
  eventId?: string;
};

export async function getMissionControlMapData(): Promise<MissionControlMapData> {
  const { data: eventRow } = await supabase
    .from("events")
    .select("id, name, organization_id, organizations(name, slug)")
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!eventRow?.id) {
    return { spots: [] };
  }

  const { data: spots, error } = await supabase
    .from("staging_spots")
    .select(
      "id, spot_code, section, street_name, latitude, longitude, geofence_radius_feet, reserved_length_feet, entries(id, name, check_in_status)"
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
  };
}