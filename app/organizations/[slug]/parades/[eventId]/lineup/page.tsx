import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { autoNumberLineup } from "./actions";
import { StatusBadge } from "@/components/ui/StatusBadge";

type LineupPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function LineupPage({ params }: LineupPageProps) {
  const { slug, eventId } = await params;

  const { data: organization } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("slug", slug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();


const { data: entries, error } = await supabase
  .from("entries")
  .select(
    "id, name, entry_type, status, parade_number, lineup_position, section, staging_spot, check_in_status, staging_spots(spot_code, section, street_name)"
  )
  .eq("event_id", eventId)
  .order("lineup_position", { ascending: true, nullsFirst: false })
  .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          {
            label: organization?.name || "Organization",
            href: `/organizations/${slug}`,
          },
          {
            label: event?.name || "Parade",
            href: `/organizations/${slug}/parades/${eventId}`,
          },
          { label: "Lineup" },
        ]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Parade Lineup Builder
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">Lineup</h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Build the official parade order, assign parade numbers, and prepare
            entries for staging and parade-day operations.
          </p>
        </div>

        <div className="flex gap-3">
          <form action={autoNumberLineup}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />
            <Button>Auto Number</Button>
          </form>

          <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
            <Button variant="secondary">Manage Entries</Button>
          </Link>
        </div>
      </div>

      <Card title="Official Lineup">
        {entries && entries.length > 0 ? (
          <div className="mt-6 grid gap-3">
            {entries.map((entry, index) => {
		const paradeNumber = entry.parade_number || index + 1;
		const previousEntry = entries[index - 1];
		const nextEntry = entries[index + 1];
		const assignedSpot = Array.isArray(entry.staging_spots)
		  ? entry.staging_spots[0]
		  : entry.staging_spots;

              return (
                <div
                  key={entry.id}
                  className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[90px_1fr_180px]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      Number
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      #{String(paradeNumber).padStart(3, "0")}
                    </p>
		<p className="mt-2 text-sm text-slate-500">
  		Follows:{" "}
  		{previousEntry
    		? `#${String(previousEntry.parade_number || index).padStart(3, "0")} ${previousEntry.name}`
    		: "Start of parade"}
		</p>

		<p className="mt-1 text-sm text-slate-500">
  		Ahead of:{" "}
  		{nextEntry
    		? `#${String(nextEntry.parade_number || index + 2).padStart(3, "0")} ${nextEntry.name}`
    		: "End of parade"}
		</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {entry.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {entry.entry_type} • {entry.status}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
			Section: {assignedSpot?.section || entry.section || "Unassigned"} • Spot:{" "}
{assignedSpot?.spot_code || entry.staging_spot || "Unassigned"}
                    </p>
                  </div>

                  <div className="text-sm text-slate-400">
                    <p>Status</p>

		<StatusBadge status={entry.check_in_status} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-slate-400">
            No entries yet. Add entries before building the lineup.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
