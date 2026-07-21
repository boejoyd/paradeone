import Link from "next/link";

import { createOrReuseParticipantToken } from "@/lib/participantToken";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ParticipantTestPage() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    throw new Error("Participant test access is temporarily unavailable.");
  }

  const { data: latestEntry, error } = await supabase
    .from("entries")
    .select("id, name, event_id, events(id, name, organization_id, organizations(name))")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const event = Array.isArray(latestEntry?.events)
    ? latestEntry.events[0]
    : latestEntry?.events;
  const organization = Array.isArray(event?.organizations)
    ? event.organizations[0]
    : event?.organizations;

  if (!latestEntry || !event?.id || !event.organization_id) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
            Participant Test
          </p>
          <h1 className="mt-3 text-2xl font-bold">No entry available</h1>
          <p className="mt-3 text-sm text-slate-300">
            Add at least one entry in the database to generate a participant token.
          </p>
        </section>
      </main>
    );
  }

  const tokenPayload = await createOrReuseParticipantToken({
    organizationId: event.organization_id,
    eventId: latestEntry.event_id,
    entryId: latestEntry.id,
  });

  const participantHref = `/participant/${encodeURIComponent(tokenPayload.token)}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
          Participant Test
        </p>
        <h1 className="mt-3 text-2xl font-bold">Local participant link</h1>

        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>Organization: {organization?.name || "Unknown"}</p>
          <p>Parade: {event.name || "Unknown"}</p>
          <p>Entry: {latestEntry.name}</p>
        </div>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
          <p className="text-slate-400">Participant Route</p>
          <Link href={participantHref} className="mt-2 block break-all font-semibold text-blue-300 hover:text-blue-200">
            {participantHref}
          </Link>
        </div>
      </section>
    </main>
  );
}
