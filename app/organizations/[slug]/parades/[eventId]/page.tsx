import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
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

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, event_date, start_time, city, expected_entries, staging_sections, status")
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

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

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Mission Control
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">{event.name}</h2>
        <p className="mt-4 text-lg text-slate-300">
          {event.city || "No city set"} • {event.event_date || "No date set"}
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Status" value={event.status} />
        <StatCard label="Expected" value={event.expected_entries || 0} />
        <StatCard label="Sections" value={event.staging_sections || 0} />
        <StatCard label="Checked In" value="0" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Operations Briefing">
          This is where ParadeOne will summarize what needs attention for this parade.
        </Card>

        <Card title="Next Build">
          Entries, sections, staging spots, and parade-day check-in will attach to this parade.
        </Card>
      </div>
    </AppShell>
  );
}
