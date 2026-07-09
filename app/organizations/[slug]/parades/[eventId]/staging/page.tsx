import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
      "id, spot_code, section, street_name, latitude, longitude, geofence_radius_feet, reserved_length_feet, entries(id, name, parade_number, check_in_status)"
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

      <div className="space-y-6">
        <div>
          <LiveStagingMap
            spots={spots || []}
            editBasePath={`/organizations/${slug}/parades/${eventId}/staging`}
          />
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-3 md:p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Staging Spots
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">
              Spot Directory
            </h3>
          </div>

          {spots && spots.length > 0 ? (
            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-800/80 bg-slate-950">
              <table className="min-w-full divide-y divide-slate-800/70 text-left text-xs md:text-sm">
                <thead className="sticky top-0 bg-slate-950/95 text-slate-300 backdrop-blur">
                  <tr>
                    <th className="px-2.5 py-2 font-medium md:px-3">Spot / Position</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Entry #</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Unit / Float Name</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Section</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Status</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Check-In</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">GPS</th>
                    <th className="px-2.5 py-2 font-medium md:px-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {spots.map((spot) => {
                    const entry = Array.isArray(spot.entries) ? spot.entries[0] : null;
                    const isCheckedIn =
                      entry?.check_in_status === "ready" || entry?.check_in_status === "checked_in";

                    return (
                      <tr id={`spot-${spot.id}`} key={spot.id} className="align-top">
                        <td className="px-2.5 py-2 md:px-3">
                          <p className="font-semibold text-white">{spot.spot_code}</p>
                          <p className="text-[11px] text-slate-500">{spot.street_name || "No street"}</p>
                        </td>
                        <td className="px-2.5 py-2 md:px-3">
                          {entry?.parade_number != null ? `#${entry.parade_number}` : "-"}
                        </td>
                        <td className="px-2.5 py-2 md:px-3">{entry?.name || "Unassigned"}</td>
                        <td className="px-2.5 py-2 md:px-3">{spot.section || "No section"}</td>
                        <td className="px-2.5 py-2 md:px-3">
                          <StatusBadge status={entry?.check_in_status || "not_checked_in"} />
                        </td>
                        <td className="px-2.5 py-2 md:px-3">
                          {isCheckedIn ? "Checked In" : "Not Checked In"}
                        </td>
                        <td className="px-2.5 py-2 text-[11px] text-slate-400 md:px-3 md:text-xs">
                          {spot.latitude != null && spot.longitude != null
                            ? `${spot.latitude}, ${spot.longitude}`
                            : "Unset"}
                        </td>
                        <td className="px-2.5 py-2 md:px-3">
                          <Link href={`/organizations/${slug}/parades/${eventId}/staging/${spot.id}/edit`}>
                            <Button variant="secondary">Edit</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400">
              No staging spots yet. Add your first spot.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
