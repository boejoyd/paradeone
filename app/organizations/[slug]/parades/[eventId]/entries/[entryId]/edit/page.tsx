import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateEntry } from "./actions";

type EditEntryPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
    entryId: string;
  }>;
};

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { slug, eventId, entryId } = await params;

  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();

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
          { label: "Parade Setup", href: "/organizations" },
          { label: organization?.name || "Organization", href: `/organizations/${slug}` },
          { label: event?.name || "Parade", href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Entries", href: `/organizations/${slug}/parades/${eventId}/entries` },
          { label: entry.name, href: `/organizations/${slug}/parades/${eventId}/entries/${entryId}` },
          { label: "Edit" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Entry Management
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Edit Entry</h2>
      </div>

      <Card title="Entry Details">
        <form action={updateEntry} className="mt-6 grid gap-5">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="entryId" value={entryId} />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Entry Name</span>
            <input name="name" required defaultValue={entry.name} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Entry Type</span>
              <select name="entryType" defaultValue={entry.entry_type} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
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

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Status</span>
              <select name="status" defaultValue={entry.status} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="assigned">Assigned</option>
                <option value="checked_in">Checked In</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Contact Name</span>
              <input name="contactName" defaultValue={entry.contact_name || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Contact Phone</span>
              <input name="contactPhone" defaultValue={entry.contact_phone || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Contact Email</span>
            <input name="contactEmail" type="email" defaultValue={entry.contact_email || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Estimated Length in Feet</span>
            <input name="estimatedLengthFeet" type="number" min="0" defaultValue={entry.estimated_length_feet || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Staging Spot</span>
            <select name="stagingSpotId" defaultValue={entry.staging_spot_id || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
              <option value="">Unassigned</option>
              {stagingSpots?.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.spot_code} — {spot.section || "No section"} — {spot.street_name || "No street"}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Announcer Script</span>
            <textarea name="announcerScript" rows={7} defaultValue={entry.announcer_script || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <div className="pt-4">
            <Button>Save Changes</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
