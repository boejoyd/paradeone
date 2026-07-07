import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";

export default function MissionControlQueuePage() {
  return (
    <AppShell>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Mission Control / Operations Feed</p>
        <Link
          href="/"
          className="inline-flex rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
        >
          Back to Mission Control
        </Link>
      </div>

      <div className="min-h-[calc(100dvh-5.75rem)]">
        <MissionControlConsole view="queue" />
      </div>
    </AppShell>
  );
}
