import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { createEntry } from "./actions";

type NewEntryPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function NewEntryPage({ params }: NewEntryPageProps) {
  const { slug, eventId } = await params;

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: organization?.name || "Organization", href: `/organizations/${slug}` },
          { label: event?.name || "Parade", href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Entries", href: `/organizations/${slug}/parades/${eventId}/entries` },
          { label: "Add Entry" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Entry
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Add Entry</h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Add a float, walking group, vehicle, band, sponsor, or other parade participant.
        </p>
      </div>

      <Card title="Entry Details">
        <form action={createEntry} className="mt-6 grid gap-5">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="eventId" value={eventId} />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Entry Name</span>
            <input name="name" required className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Entry Type</span>
            <select name="entryType" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
              <option value="float">Float</option>
              <option value="walking_group">Walking Group</option>
              <option value="vehicle">Vehicle</option>
              <option value="band">Band</option>
              <option value="motorcycle_group">Motorcycle Group</option>
              <option value="dignitary">Dignitary</option>
              <option value="sponsor">Sponsor</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Contact Name</span>
              <input name="contactName" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Contact Phone</span>
              <input name="contactPhone" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Contact Email</span>
            <input name="contactEmail" type="email" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Estimated Length in Feet</span>
            <input name="estimatedLengthFeet" type="number" min="0" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Announcer Script</span>
            <textarea name="announcerScript" rows={6} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <div className="pt-4">
            <Button>Add Entry</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
