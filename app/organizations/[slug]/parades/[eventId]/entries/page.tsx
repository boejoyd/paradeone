import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type EntriesPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function EntriesPage({ params }: EntriesPageProps) {
  const { slug, eventId } = await params;

  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, name, entry_type, status, contact_name")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          {
            label: organization?.name || "Organization",
            href: `/organizations/${slug}`,
          },
          {
            label: event?.name || "Parade",
            href: `/organizations/${slug}/parades/${eventId}`,
          },
          { label: "Entries" },
        ]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Parade Entries
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">Entries</h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Manage floats, walking groups, vehicles, sponsors, bands, and other
            parade participants.
          </p>
        </div>

        <Link href={`/organizations/${slug}/parades/${eventId}/entries/new`}>
          <Button>Add Entry</Button>
        </Link>
      </div>

      <Card title="Entries">
        {entries && entries.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/organizations/${slug}/parades/${eventId}/entries/${entry.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-blue-500 hover:bg-slate-900"
              >
                <h3 className="text-lg font-semibold text-white">
                  {entry.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {entry.entry_type} • {entry.contact_name || "No contact set"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {entry.status}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-400">
            No entries yet. Add your first parade entry.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
