import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { RouteOperationsEditor } from "@/components/routes/RouteOperationsEditor";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string; eventId: string }> };

export default async function RouteOperationsPage({ params }: Props) {
  const { slug, eventId } = await params;
  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();
  const [{ data: route }, { data: checkpoints, error }] = await Promise.all([
    supabase.from("parade_routes").select("route_geometry, corridor_width_feet").eq("event_id", eventId).maybeSingle(),
    supabase.from("route_checkpoints").select("id, name, checkpoint_type, latitude, longitude, geofence_radius_feet, sort_order").eq("event_id", eventId).order("sort_order"),
  ]);
  if (error) throw new Error(error.message);
  return <AppShell>
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: organization.name, href: `/organizations/${slug}` }, { label: event.name, href: `/organizations/${slug}/parades/${eventId}` }, { label: "Route & Operations" }]} />
    <PageHeader eyebrow="Parade setup" title="Route & Operations Setup" description="Define the route corridor and the checkpoints used during parade-day operations." />
    <RouteOperationsEditor eventId={eventId} routeGeometry={route?.route_geometry ?? null} initialCorridorWidthFeet={route?.corridor_width_feet ?? 60} initialCheckpoints={checkpoints ?? []} />
  </AppShell>;
}
