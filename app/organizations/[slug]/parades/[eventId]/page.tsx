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

  const { count: stagedCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("staging_spot_id", "is", null);

  const { count: checkedInCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("check_in_status", "checked_in");

  const missingCount = (entryCount || 0) - (checkedInCount || 0);

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

      <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          ParadeOne Mission Control
        </p>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-5xl font-bold tracking-tight">{event.name}</h2>
            <p className="mt-4 text-lg text-slate-300">
              {event.city || "No city set"} • {event.event_date || "No date set"}{" "}
              {event.start_time ? `• ${event.start_time}` : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
              <Button>Open Lineup</Button>
            </Link>

            <Link href={`/organizations/${slug}/parades/${eventId}/staging`}>
              <Button variant="secondary">Open Live Map</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Entries" value={entryCount || 0} />
        <StatCard label="Staged" value={stagedCount || 0} />
        <StatCard label="Checked In" value={checkedInCount || 0} />
        <StatCard label="Missing" value={missingCount} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card title="Current Operational Status">
          <p>
            Parade status: <span className="text-white">{event.status}</span>
          </p>
          <p className="mt-2">
            Expected entries:{" "}
            <span className="text-white">{event.expected_entries || 0}</span>
          </p>
          <p className="mt-2">
            Staging sections:{" "}
            <span className="text-white">{event.staging_sections || 0}</span>
          </p>
        </Card>

        <Card title="Immediate Attention">
          <p>
            {missingCount > 0
              ? `${missingCount} entries have not checked in yet.`
              : "No missing entries right now."}
          </p>
          <p className="mt-2">
            {(entryCount || 0) - (stagedCount || 0)} entries still need staging
            assignments.
          </p>
        </Card>

        <Card title="Parade Day Mode">
          <p>
            Live check-ins, section releases, GPS movement, SMS alerts,
            announcer view, and judging tools will flow through this command
            center.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Entries">
          <p>Manage participants, contacts, scripts, and participant links.</p>
          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
              <Button variant="secondary">Open Entries</Button>
            </Link>
          </div>
        </Card>

        <Card title="Lineup">
          <p>Build the official parade order and front/behind relationships.</p>
          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/lineup`}>
              <Button variant="secondary">Open Lineup</Button>
            </Link>
          </div>
        </Card>

        <Card title="Staging Map">
          <p>Create staging spots, assign GPS coordinates, and view map pins.</p>
          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/staging`}>
              <Button variant="secondary">Open Staging</Button>
            </Link>
          </div>
        </Card>

        <Card title="Participant Links">
          <p>Share participant and GPS check-in links from each entry detail page.</p>
          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/entries`}>
              <Button variant="secondary">Open Entry Links</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
