import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StagingLocationPicker } from "@/components/staging/StagingLocationPicker";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStagingSpot } from "./actions";

type NewStagingSpotPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function NewStagingSpotPage({
  params,
}: NewStagingSpotPageProps) {
  const { slug, eventId } = await params;

  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();
  const { data: existingSpots, error: spotsError } = await supabase
    .from("staging_spots")
    .select("id, spot_code, section, street_name, latitude, longitude, entries(name)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("spot_code", { ascending: true });

  if (spotsError) throw new Error(spotsError.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          { label: organization?.name || "Organization", href: `/organizations/${slug}` },
          { label: event?.name || "Parade", href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Staging", href: `/organizations/${slug}/parades/${eventId}/staging` },
          { label: "Add Spot" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Staging Builder
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          Add Staging Spot
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Create a physical staging location with coordinates, section, and
          geofence settings.
        </p>
      </div>

      <Card title="Spot Details">
        <form action={createStagingSpot} className="mt-6 grid gap-5">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="eventId" value={eventId} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">
                Spot Code
              </span>
              <input
                name="spotCode"
                required
                placeholder="B-01"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">
                Section
              </span>
              <input
                name="section"
                placeholder="Blue Section"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Street Name
            </span>
            <input
              name="streetName"
              placeholder="Main Street"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <StagingLocationPicker existingSpots={existingSpots || []} />

          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">
                Geofence Radius
              </span>
              <input
                name="geofenceRadiusFeet"
                type="number"
                min="25"
                defaultValue="125"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">
                Reserved Length
              </span>
              <input
                name="reservedLengthFeet"
                type="number"
                min="0"
                placeholder="65"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">
                Sort Order
              </span>
              <input
                name="sortOrder"
                type="number"
                min="0"
                placeholder="1"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

          <div className="pt-4">
            <Button>Add Staging Spot</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
