import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatVehicleType } from "@/lib/entries/vehicleTypes";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateRegistrationStatus } from "./actions";

type Props = { params: Promise<{ slug: string; eventId: string }> };

export default async function RegistrationReviewPage({ params }: Props) {
  const { slug, eventId } = await params;
  const { organization, event } = await requireAccessibleEventContext(slug, eventId);
  const supabase = await createServerSupabaseClient();
  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, name, entry_type, vehicle_type, status, contact_name, contact_email, contact_phone, estimated_length_feet, announcer_script, created_at")
    .eq("event_id", eventId)
    .in("status", ["submitted", "needs_review", "approved", "assigned", "rejected"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const records = entries ?? [];
  const count = (status: string) => records.filter((entry) => entry.status === status).length;

  return (
    <AppShell>
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: organization.name, href: `/organizations/${slug}` },
        { label: event.name, href: `/organizations/${slug}/parades/${eventId}` },
        { label: "Entries", href: `/organizations/${slug}/parades/${eventId}/entries` },
        { label: "Registration Review" },
      ]} />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Organizer Review</p>
          <h1 className="mt-3 text-4xl font-bold">Registration Review</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Approve complete applications before they enter the lineup and staging workflow.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/register/${eventId}`} target="_blank"><Button variant="secondary">Open Public Form</Button></Link>
          <Link href={`/organizations/${slug}/parades/${eventId}/edit`}><Button variant="secondary">Registration Settings</Button></Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted" value={count("submitted")} />
        <StatCard label="Needs Review" value={count("needs_review")} />
        <StatCard label="Approved" value={count("approved") + count("assigned")} />
        <StatCard label="Rejected" value={count("rejected")} />
      </div>

      <Card title="Applications">
        {records.length ? (
          <div className="mt-5 grid gap-4">
            {records.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{entry.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{entry.entry_type} • {formatVehicleType(entry.vehicle_type)} • {entry.estimated_length_feet || "Length not provided"} ft</p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                    <p className="font-semibold text-white">Primary Contact</p>
                    <p className="mt-2 text-slate-300">{entry.contact_name || "Not provided"}</p>
                    <p className="text-slate-400">{entry.contact_email || "No email"}</p>
                    <p className="text-slate-400">{entry.contact_phone || "No phone"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                    <p className="font-semibold text-white">Announcer Script</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">{entry.announcer_script || "No script submitted."}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={updateRegistrationStatus}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button name="status" value="approved" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                  </form>
                  <form action={updateRegistrationStatus}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button name="status" value="needs_review" className="rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-300">Needs Review</button>
                  </form>
                  <form action={updateRegistrationStatus}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button name="status" value="rejected" className="rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-300">Reject</button>
                  </form>
                  <Link href={`/organizations/${slug}/parades/${eventId}/entries/${entry.id}/edit`} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200">Edit Details</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-400">No registration applications yet.</p>
        )}
      </Card>
    </AppShell>
  );
}
