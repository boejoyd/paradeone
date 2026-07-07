import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";

export default function MissionControlQueuePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Mission Control"
        title="Operational Queue"
        description="Dedicated large-screen queue for mission-control tasks, priorities, and status review."
        actions={
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
          >
            Back to Mission Control
          </Link>
        }
      />
      <MissionControlConsole view="queue" />
    </AppShell>
  );
}
