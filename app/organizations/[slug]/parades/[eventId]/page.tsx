import Link from "next/link";
import { ActionBar } from "@/components/layout/ActionBar";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

  const { count: checkedInCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("check_in_status", "checked_in");

  const { count: stagedCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("staging_spot_id", "is", null);

  const missingCount = (entryCount || 0) - (checkedInCount || 0);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          {
            label: organization.name,
            href: `/organizations/${organization.slug}`,
          },
          { label: event.name },
        ]}
      />

      <PageHeader
        eyebrow="Parade Mission Control"
        title={event.name}
        description={`${event.city || "No city set"} • ${
          event.event_date || "No date set"
        }${event.start_time ? ` • ${event.start_time}` : ""}`}
        actions={
          <ActionBar>
            <StatusBadge status={event.status} />

            <Link href={`/organizations/${slug}/parades/${eventId}/edit`}>
              <Button variant="secondary">Edit Parade</Button>
            </Link>

            <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
              <Button>Open Lineup</Button>
            </Link>

            <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
              <Button variant="secondary">Manage Entries</Button>
            </Link>
          </ActionBar>
        }
      />

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Entries" value={entryCount || 0} />
        <StatCard label="Staged" value={stagedCount || 0} />
        <StatCard label="Checked In" value={checkedInCount || 0} />
        <StatCard label="Missing" value={missingCount} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Entries">
          <p>
            Manage participants, contact information, float types, announcer
            scripts, participant links, and check-in pages.
          </p>

          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
              <Button variant="secondary">Open Entries</Button>
            </Link>
          </div>
        </Card>

        <Card title="Lineup Builder">
          <p>
            Build the official parade order, assign parade numbers, and show
            which entry each participant follows and leads.
          </p>

          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
              <Button variant="secondary">Open Lineup</Button>
            </Link>
          </div>
        </Card>

        <Card title="Staging">
          <p>
            Create staging spots, assign GPS coordinates, define geofences, and
            prepare parade-day self check-ins.
          </p>

          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/staging`}>
              <Button variant="secondary">Open Staging</Button>
            </Link>
          </div>
        </Card>

        <Card title="Parade Day Operations">
          <p>
            Live check-ins, section releases, GPS movement, SMS alerts, and
            announcer/judge tools will flow through Mission Control.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
