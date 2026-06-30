import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase";

type ParadePageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function ParadePage({ params }: ParadePageProps) {
  const { slug, eventId } = await params;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (organizationError) throw new Error(organizationError.message);

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, event_date, start_time, city, expected_entries, staging_sections, status"
    )
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .single();

  if (eventError) throw new Error(eventError.message);

  const { count: entryCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: organization.name, href: `/organizations/${organization.slug}` },
          { label: event.name },
        ]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Parade Mission Control
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">
            {event.name}
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            {event.city || "No city set"} • {event.event_date || "No date set"}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
            <Button>Open Lineup</Button>
          </Link>

          <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
            <Button variant="secondary">Manage Entries</Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Status" value={event.status} />
        <StatCard label="Entries" value={entryCount || 0} />
        <StatCard label="Expected" value={event.expected_entries || 0} />
        <StatCard label="Sections" value={event.staging_sections || 0} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Lineup Builder">
          <p>
            Build the official parade order, assign parade numbers, and prepare
            entries for staging.
          </p>

          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
              <Button variant="secondary">Open Lineup</Button>
            </Link>
          </div>
        </Card>

        <Card title="Entries">
          <p>
            Manage participants, contact information, float types, and announcer
            scripts.
          </p>

          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
              <Button variant="secondary">Open Entries</Button>
            </Link>
          </div>
        </Card>

        <Card title="Staging">
          Sections, staging spots, geofences, and assigned lineup positions will
          attach to this parade.
        </Card>

        <Card title="Parade Day">
          Live check-ins, section releases, GPS movement, and SMS alerts will
          eventually flow through this Mission Control screen.
        </Card>
      </div>
    </AppShell>
  );
}
