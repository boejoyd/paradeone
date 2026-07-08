import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAccessibleEventContext } from "@/lib/organizations/access";
import Link from "next/link";
import { createEntry } from "./actions";

type NewEntryPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
  }>;
};

export default async function NewEntryPage({ params }: NewEntryPageProps) {
  const { slug, eventId } = await params;

  const { organization, event } = await requireAccessibleEventContext(slug, eventId);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
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

          <label className="rounded-xl border border-slate-700/80 bg-slate-950/70 p-4 text-sm text-slate-200">
            <span className="flex items-start gap-3">
              <input
                type="checkbox"
                name="smsConsent"
                value="agree"
                className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400"
              />
              <span className="leading-6">
                I agree to receive operational text messages from Parade One regarding parade registration, lineup
                assignments, scheduling updates, volunteer coordination, check-in, safety alerts, emergency
                notifications, and live parade operations. Message and data rates may apply. Reply STOP to opt out and
                HELP for assistance. By checking this box, I acknowledge that I have read and agree to the{" "}
                <Link href="/privacy" className="underline decoration-slate-500 underline-offset-2 hover:text-white">
                  Privacy Policy
                </Link>
                ,{" "}
                <Link href="/terms" className="underline decoration-slate-500 underline-offset-2 hover:text-white">
                  Terms of Service
                </Link>
                , and{" "}
                <Link href="/sms-terms" className="underline decoration-slate-500 underline-offset-2 hover:text-white">
                  SMS Terms
                </Link>
                .
              </span>
            </span>
          </label>

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
