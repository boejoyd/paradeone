import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function Home() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, event_date, status, city")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

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
            Real-time parade registration, staging, communication, and operations.
          </p>
        </div>

        <Link href="/create-parade">
          <Button>Create Parade</Button>
        </Link>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard label="Events" value={events?.length || 0} />
        <StatCard label="Entries" value="0" />
        <StatCard label="Checked In" value="0" />
        <StatCard label="Sections" value="0" />
      </div>

      <div className="grid gap-6">
        <Card title="Your Parades">
          {events && events.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {event.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {event.city || "No city set"} •{" "}
                        {event.event_date || "No date set"}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-slate-400">
              No parades yet. Create your first parade to begin.
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
