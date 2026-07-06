import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { createParadeUnitAction } from "./actions";

type NewParadeUnitPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function NewParadeUnitPage({ params }: NewParadeUnitPageProps) {
  const { slug, eventId } = await params;

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
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
          { label: "Units", href: `/organizations/${slug}/parades/${eventId}/units` },
          { label: "Add Unit" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Parade Unit</p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Create Parade Unit</h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Add an operational unit for parade-day lineup, check-in, and staging.
        </p>
      </div>

      <Card title="Unit Details">
        <form action={createParadeUnitAction} className="mt-6 grid gap-5">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizationId" value={organization?.id || ""} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Entry Number</span>
              <input
                name="entryNumber"
                type="number"
                min="1"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Unit Type</span>
              <input
                name="unitType"
                defaultValue="float"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Unit Name</span>
            <input
              name="name"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <input
              name="category"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Captain Name</span>
              <input
                name="captainName"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Captain Email</span>
              <input
                name="captainEmail"
                type="email"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Captain Phone</span>
            <input
              name="captainPhone"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Driver Name</span>
              <input
                name="driverName"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Driver Phone</span>
              <input
                name="driverPhone"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Vehicle Description</span>
            <textarea
              name="vehicleDescription"
              rows={3}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Announcer Script</span>
            <textarea
              name="announcerScript"
              rows={5}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Notes</span>
            <textarea
              name="notes"
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <div className="pt-4">
            <Button>Create Parade Unit</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
