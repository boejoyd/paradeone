import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, event_date, status, city, organizations(name, slug)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          ParadeOne
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Dashboard</h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Choose a parade workspace to manage entries, staging, lineup, and
          operations.
        </p>
      </div>

      <Card title="Recent Parades">
        {events && events.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {events.map((event) => {
              const organization = Array.isArray(event.organizations)
                ? event.organizations[0]
                : event.organizations;

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        {organization?.name || "Unknown organization"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-white">
                        {event.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {event.city || "No city set"} •{" "}
                        {event.event_date || "No date set"}
                      </p>
                    </div>

                    {organization?.slug && (
                      <Link
                        href={`/organizations/${organization.slug}/parades/${event.id}`}
                      >
                        <Button>Open Parade</Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-slate-400">
            No parades yet. Create your first parade to begin.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Link href="/parades">
            <Button>View All Parades</Button>
          </Link>

          <Link href="/create-parade">
            <Button variant="secondary">Create Parade</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
