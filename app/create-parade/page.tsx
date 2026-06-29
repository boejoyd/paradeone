import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CreateParadePage() {
  return (
    <AppShell>
      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Setup
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          Create Parade
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Start a new parade by creating the event, basic timeline, and expected staging needs.
        </p>
      </div>

      <Card title="Parade Details">
        <form className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Parade Name</span>
            <input className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Organization</span>
            <input className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Parade Date</span>
              <input type="date" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Start Time</span>
              <input type="time" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Expected Entries</span>
              <input type="number" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Staging Sections</span>
              <input type="number" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </label>
          </div>

          <div className="pt-4">
            <Button>Create Parade</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
