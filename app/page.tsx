import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <div className="mb-12 flex items-start justify-between gap-8">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
              Mission Control
            </p>
            <h1 className="mt-4 text-5xl font-bold tracking-tight">
              ParadeOne
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Real-time parade registration, staging, communication, and operations.
            </p>
          </div>

          <Button>Create Parade</Button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard label="Events" value="0" />
          <StatCard label="Entries" value="0" />
          <StatCard label="Checked In" value="0" />
          <StatCard label="Sections" value="0" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Create Parade">
            Set up a parade, sections, staging zones, and entry capacity.
          </Card>

          <Card title="Mission Control">
            Monitor arrivals, section readiness, messages, and movement.
          </Card>

          <Card title="Live Map">
            Track entries, staging spots, check-ins, and route flow.
          </Card>
        </div>
      </section>
    </main>
  );
}
