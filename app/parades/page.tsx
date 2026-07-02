import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { OpenMissionControlButton } from "@/components/parades/OpenMissionControlButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ParadesPage() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, event_date, status, city, organizations(name, slug)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Parades" }]} />

      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Event Workbench
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">Parades</h2>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Choose a parade to manage entries, lineup, staging, check-ins, and
            live operations.
          </p>
        </div>

        <Link href="/create-parade">
          <Button>Create Parade</Button>
        </Link>
      </div>

      <Card title="All Parades">
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

                      <span className="mt-3 inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        {formatStatus(event.status)}
                      </span>
                    </div>

                    {organization?.slug && (
                      <OpenMissionControlButton
                        href={`/organizations/${organization.slug}/parades/${event.id}`}
                        organizationName={organization.name}
                        organizationSlug={organization.slug}
                        paradeId={event.id}
                        paradeName={event.name}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
            <h3 className="text-xl font-semibold text-white">No parades yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Create your first parade to start managing entries, staging,
              lineup, and operations.
            </p>
            <div className="mt-6">
              <Link href="/create-parade">
                <Button>Create Parade</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
