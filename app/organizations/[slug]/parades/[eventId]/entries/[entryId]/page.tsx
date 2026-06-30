import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

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

  if (error) {
    throw new Error(error.message);
  }

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

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Entry Detail
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">{entry.name}</h2>
        <p className="mt-4 text-lg text-slate-300">
          {entry.entry_type} • {entry.status}
        </p>
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

        <Card title="Announcer Script">
          <p className="whitespace-pre-wrap">
            {entry.announcer_script || "No announcer script yet."}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
