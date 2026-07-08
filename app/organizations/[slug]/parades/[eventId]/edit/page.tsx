import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateParade, deleteParade } from "./actions";

type EditParadePageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function EditParadePage({ params }: EditParadePageProps) {
  const { slug, eventId } = await params;

  const { organization } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .single();

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          { label: organization?.name || "Organization", href: `/organizations/${slug}` },
          { label: event.name, href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Edit" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Settings
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Edit Parade</h2>
      </div>

      <div className="grid gap-6">
        <Card title="Parade Details">
          <form action={updateParade} className="mt-6 grid gap-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Parade Name</span>
              <input name="name" required defaultValue={event.name} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">City</span>
              <input name="city" defaultValue={event.city || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Parade Date</span>
                <input name="eventDate" type="date" defaultValue={event.event_date || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Start Time</span>
                <input name="startTime" type="time" defaultValue={event.start_time || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Expected Entries</span>
                <input name="expectedEntries" type="number" min="0" defaultValue={event.expected_entries || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Staging Sections</span>
                <input name="stagingSections" type="number" min="0" defaultValue={event.staging_sections || ""} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Status</span>
              <select name="status" defaultValue={event.status} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="registration_closed">Registration Closed</option>
                <option value="lineup_building">Lineup Building</option>
                <option value="lineup_locked">Lineup Locked</option>
                <option value="check_in_open">Check-In Open</option>
                <option value="parade_active">Parade Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <div className="pt-4">
              <Button>Save Changes</Button>
            </div>
          </form>
        </Card>

        <Card title="Danger Zone">
          <p>
            Delete this parade and all related entries, staging spots, and
            check-ins.
          </p>

          <form action={deleteParade} className="mt-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={eventId} />

            <button
              type="submit"
              className="rounded-xl border border-red-900 bg-red-950 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-900"
            >
              Delete Parade
            </button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
