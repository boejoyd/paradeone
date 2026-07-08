import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { LiveStagingMap } from "@/components/maps/LiveStagingMap";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type StagingPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function StagingPage({ params }: StagingPageProps) {
  const { slug, eventId } = await params;

  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();

  const { data: spots, error } = await supabase
    .from("staging_spots")
    .select(
      "id, spot_code, section, street_name, latitude, longitude, geofence_radius_feet, reserved_length_feet, entries(id, name, check_in_status)"
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("spot_code", { ascending: true });

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          {
            label: organization?.name || "Organization",
            href: `/organizations/${slug}`,
          },
          {
            label: event?.name || "Parade",
            href: `/organizations/${slug}/parades/${eventId}`,
          },
          { label: "Staging" },
        ]}
      />

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Staging Builder
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">Staging</h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Create staging spots with GPS coordinates, sections, streets, and
            geofence rules.
          </p>
        </div>

        <Link href={`/organizations/${slug}/parades/${eventId}/staging/new`}>
          <Button>Add Spot</Button>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="xl:sticky xl:top-6">
          <LiveStagingMap
            spots={spots || []}
            editBasePath={`/organizations/${slug}/parades/${eventId}/staging`}
          />
        </div>

        <aside className="max-h-[720px] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-4">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Staging Spots
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Spot Directory
            </h3>
          </div>

          {spots && spots.length > 0 ? (
            <div className="grid gap-3">
              {spots.map((spot) => (
                <div
                  id={`spot-${spot.id}`}
                  key={spot.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition-all duration-300"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {spot.spot_code}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {spot.section || "No section"} •{" "}
                    {spot.street_name || "No street"}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    GPS: {spot.latitude ?? "unset"},{" "}
                    {spot.longitude ?? "unset"} • Radius:{" "}
                    {spot.geofence_radius_feet} ft
                  </p>

                  <div className="mt-4">
                    <Link
                      href={`/organizations/${slug}/parades/${eventId}/staging/${spot.id}/edit`}
                    >
                      <Button variant="secondary">Edit Spot</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">
              No staging spots yet. Add your first spot.
            </p>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
