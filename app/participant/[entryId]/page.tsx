import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type ParticipantPageProps = {
  params: Promise<{
    entryId: string;
  }>;
};

export default async function ParticipantPage({ params }: ParticipantPageProps) {
  const { entryId } = await params;

  const { data: entry, error } = await supabase
    .from("entries")
    .select(
      "id, name, entry_type, parade_number, check_in_status, announcer_script, staging_spots(spot_code, section, street_name, latitude, longitude, geofence_radius_feet)"
    )
    .eq("id", entryId)
    .single();

  if (error) throw new Error(error.message);

  const spot = Array.isArray(entry.staging_spots)
    ? entry.staging_spots[0]
    : entry.staging_spots;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          ParadeOne Participant
        </p>

        <h1 className="mt-4 text-4xl font-bold">{entry.name}</h1>

        <p className="mt-3 text-lg text-slate-300">
          {entry.entry_type} • #{entry.parade_number || "Unassigned"}
        </p>

        <div className="mt-8 grid gap-6">
          <Card title="Your Staging Spot">
            <p>Spot: {spot?.spot_code || "Unassigned"}</p>
            <p>Section: {spot?.section || "Unassigned"}</p>
            <p>Street: {spot?.street_name || "Unassigned"}</p>
          </Card>

          <Card title="Check-In Status">
            <p>{entry.check_in_status || "not_checked_in"}</p>

            <div className="mt-5">
              <Link href={`/check-in/${entry.id}`}>
                <Button>Open GPS Check-In</Button>
              </Link>
            </div>
          </Card>

          <Card title="Announcer Script">
            <p className="whitespace-pre-wrap">
              {entry.announcer_script || "No announcer script has been added yet."}
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}
