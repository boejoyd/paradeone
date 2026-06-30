import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getEvents } from "@/lib/data/events";

export default async function Home() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-12 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Parade Day Command Center
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">
            Mission Control
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Real parades. Real operations. Real-time coordination.
          </p>
        </div>

        <a href="/create-parade">
          <Button>Create Parade</Button>
        </a>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Events" value={events.length} />
        <StatCard label="Entries" value="0" />
        <StatCard label="Checked In" value="0" />
        <StatCard label="Sections" value="0" />
      </div>

      <div className="grid gap-6">
        <Card title="Upcoming Parades">
          {events.length === 0 ? (
            <p>No parades created yet.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {event.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
			{event.organization_name || "No organization"} • {event.city || "No city set"}
                      </p>
                    </div>

                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {event.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-400">
                    Date: {event.event_date || "Not scheduled"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
