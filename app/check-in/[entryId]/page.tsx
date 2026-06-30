import { Card } from "@/components/ui/Card";
import { CheckInClient } from "@/components/check-in/CheckInClient";
import { supabase } from "@/lib/supabase";

type CheckInPageProps = {
  params: Promise<{
    entryId: string;
  }>;
};

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { entryId } = await params;

  const { data: entry, error } = await supabase
    .from("entries")
    .select(
      "id, name, entry_type, staging_spots(spot_code, section, street_name, latitude, longitude, geofence_radius_feet)"
    )
    .eq("id", entryId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const spot = Array.isArray(entry.staging_spots)
    ? entry.staging_spots[0]
    : entry.staging_spots;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          ParadeOne Check-In
        </p>

        <h1 className="mt-4 text-4xl font-bold">{entry.name}</h1>

        <p className="mt-3 text-slate-300">
          {entry.entry_type}
        </p>

        <div className="mt-8">
          <Card title="Assigned Staging Spot">
            <p>Spot: {spot?.spot_code || "Unassigned"}</p>
            <p>Section: {spot?.section || "Unassigned"}</p>
            <p>Street: {spot?.street_name || "Unassigned"}</p>

            <CheckInClient
              entryId={entry.id}
              spotLatitude={spot?.latitude || null}
              spotLongitude={spot?.longitude || null}
              geofenceRadiusFeet={spot?.geofence_radius_feet || 125}
            />
          </Card>
        </div>
      </section>
    </main>
  );
}
