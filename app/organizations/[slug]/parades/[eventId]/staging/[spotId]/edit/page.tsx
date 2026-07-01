import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { updateStagingSpot, deleteStagingSpot } from "./actions";

type EditStagingSpotPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
    spotId: string;
  }>;
};

export default async function EditStagingSpotPage({
  params,
}: EditStagingSpotPageProps) {
  const { slug, eventId, spotId } = await params;

  const { data: spot, error } = await supabase
    .from("staging_spots")
    .select("*")
    .eq("id", spotId)
    .eq("event_id", eventId)
    .single();

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: "Staging", href: `/organizations/${slug}/parades/${eventId}/staging` },
          { label: spot.spot_code },
          { label: "Edit" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Staging Builder
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          Edit Staging Spot
        </h2>
      </div>

      <div className="grid gap-6">
        <Card title="Spot Details">
          <form action={updateStagingSpot} className="mt-6 grid gap-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="spotId" value={spotId} />

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Spot Code</span>
              <input name="spotCode" required defaultValue={spot.spot_code} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Section</span>
              <input name="section" defaultValue={spot.section || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Street Name</span>
              <input name="streetName" defaultValue={spot.street_name || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Latitude</span>
                <input name="latitude" type="number" step="any" defaultValue={spot.latitude || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Longitude</span>
                <input name="longitude" type="number" step="any" defaultValue={spot.longitude || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Geofence Radius</span>
                <input name="geofenceRadiusFeet" type="number" min="25" defaultValue={spot.geofence_radius_feet || 125} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Reserved Length</span>
                <input name="reservedLengthFeet" type="number" min="0" defaultValue={spot.reserved_length_feet || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Reserved Width</span>
                <input name="reservedWidthFeet" type="number" min="0" defaultValue={spot.reserved_width_feet || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Sort Order</span>
              <input name="sortOrder" type="number" min="0" defaultValue={spot.sort_order || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <div className="pt-4">
              <Button>Save Changes</Button>
            </div>
          </form>
        </Card>

        <Card title="Danger Zone">
          <p>Delete this staging spot and remove any entry assignment connected to it.</p>

          <form action={deleteStagingSpot} className="mt-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="spotId" value={spotId} />

            <button
              type="submit"
              className="rounded-xl border border-red-900 bg-red-950 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-900"
            >
              Delete Staging Spot
            </button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
