import Link from "next/link";
import { ActionBar } from "@/components/layout/ActionBar";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { listMissionControlMessages } from "@/lib/mission-control/communications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendMissionControlMessageAction } from "./actions";

type ParadePageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function ParadePage({ params }: ParadePageProps) {
  const { slug, eventId } = await params;

  const { organization } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();

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

  const messages = await listMissionControlMessages({
    organizationId: organization.id,
    eventId,
  });

  const missingCount = (entryCount || 0) - (checkedInCount || 0);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
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

        <Card title="Public Registration">
          <p>
            Registration is currently <strong>{event.status === "registration_open" ? "open" : "closed"}</strong>.
            Participants can submit their own entry information without creating an account.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/register/${eventId}`} target="_blank">
              <Button variant="secondary">Open Public Form</Button>
            </Link>
            <Link href={`/organizations/${slug}/parades/${eventId}/entries/review`}>
              <Button variant="secondary">Review Registrations</Button>
            </Link>
            <Link href={`/organizations/${slug}/parades/${eventId}/edit`}>
              <Button variant="secondary">Open or Close Registration</Button>
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
          <div id="communications" className="mt-4 space-y-4">
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const titleParts = [
                    message.sender_name,
                    message.unit_name,
                    message.entry_number?.toString(),
                  ].filter((value): value is string => Boolean(value));

                  return (
                    <div key={message.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <p className="text-sm font-semibold text-white">
                        {titleParts.join(" — ")}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{message.message_body}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">
                  No communications yet. COC messages will appear here.
                </p>
              )}
            </div>

            <form action={sendMissionControlMessageAction} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="senderRole" value="COC" />

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name="senderName"
                  placeholder="Sender name"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  required
                />
                <input
                  name="unitName"
                  placeholder="Unit name"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <input
                  name="entryNumber"
                  type="number"
                  min="1"
                  placeholder="Entry #"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <textarea
                name="messageBody"
                rows={3}
                placeholder="Send a message as COC"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />

              <Button type="submit">Send Message</Button>
            </form>
          </div>
        </Card>

        <Card title="Route & Operations Setup">
          <p>View the parade route, set its operating corridor, and place start, finish, intermediate, and dispersal checkpoints.</p>
          <div className="mt-5">
            <Link href={`/organizations/${slug}/parades/${eventId}/route`}>
              <Button variant="secondary">Open Route Setup</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
