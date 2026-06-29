export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <div className="mb-16">
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

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Create Parade</h2>
            <p className="mt-2 text-slate-400">
              Set up a parade, sections, staging zones, and entry capacity.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Mission Control</h2>
            <p className="mt-2 text-slate-400">
              Monitor arrivals, section readiness, messages, and movement.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Live Map</h2>
            <p className="mt-2 text-slate-400">
              Track entries, staging spots, check-ins, and route flow.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
