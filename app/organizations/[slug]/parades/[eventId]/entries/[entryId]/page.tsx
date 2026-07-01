import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { assignStagingSpot, deleteEntry } from "./actions";

type EntryDetailPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
    entryId: string;
  }>;
};

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { slug, eventId, entryId } = await params;

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

  const { data: entry, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .eq("event_id", eventId)
    .single();

  if (error) throw new Error(error.message);

  const { data: stagingSpots } = await supabase
    .from("staging_spots")
    .select("id, spot_code, section, street_name")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("spot_code", { ascending: true });

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: organization?.name || "Organization", href: `/organizations/${slug}` },
          { label: event?.name || "Parade", href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Entries", href: `/organizations/${slug}/parades/${eventId}/entries` },
          { label: entry.name },
        ]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Entry Detail
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">{entry.name}</h2>
          <p className="mt-4 text-lg text-slate-300">
            {entry.entry_type} • {entry.status}
          </p>
        </div>

        <Link href={`/organizations/${slug}/parades/${eventId}/entries/${entryId}/edit`}>
          <Button>Edit Entry</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Contact">
          <p>Name: {entry.contact_name || "Not set"}</p>
          <p>Email: {entry.contact_email || "Not set"}</p>
          <p>Phone: {entry.contact_phone || "Not set"}</p>
        </Card>

        <Card title="Entry Details">
          <p>Type: {entry.entry_type}</p>
          <p>Status: {entry.status}</p>
          <p>Estimated Length: {entry.estimated_length_feet || "Not set"} ft</p>
        </Card>

        <Card title="Staging Assignment">
          <form action={assignStagingSpot} className="mt-4 grid gap-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="entryId" value={entryId} />

            <select
              name="stagingSpotId"
              defaultValue={entry.staging_spot_id || ""}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="">Unassigned</option>
              {stagingSpots?.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.spot_code} — {spot.section || "No section"} —{" "}
                  {spot.street_name || "No street"}
                </option>
              ))}
            </select>

            <Button>Assign Staging Spot</Button>
          </form>
        </Card>

        <Card title="Announcer Script">
          <p className="whitespace-pre-wrap">
            {entry.announcer_script || "No announcer script yet."}
          </p>
        </Card>

        <Card title="Participant View">
          <p>
            Share this page with the entry contact so they can see their parade
            number, staging spot, announcer script, and check-in link.
          </p>

          <div className="mt-5">
            <Link href={`/participant/${entry.id}`}>
              <Button variant="secondary">Open Participant View</Button>
            </Link>
          </div>
        </Card>

        <Card title="GPS Self Check-In">
          <p>
            Use this page on parade day. Check-in will only succeed when the
            device is near the assigned staging spot.
          </p>

          <div className="mt-5">
            <Link href={`/check-in/${entry.id}`}>
              <Button variant="secondary">Open Check-In Page</Button>
            </Link>
          </div>
        </Card>

        <Card title="Danger Zone">
          <p>Delete this entry and remove it from the parade.</p>

          <form action={deleteEntry} className="mt-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="entryId" value={entryId} />

            <button
              type="submit"
              className="rounded-xl border border-red-900 bg-red-950 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-900"
            >
              Delete Entry
            </button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
