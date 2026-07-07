import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { getMissionControlMapData } from "@/lib/data/missionControl";

export default async function MissionControlMapPage() {
  const mapData = await getMissionControlMapData();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Mission Control"
        title="Live Map"
        description="Large-screen live GPS staging map reused from the active parade staging experience."
        actions={
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
          >
            Back to Mission Control
          </Link>
        }
      />
      <MissionControlConsole
        view="map"
        liveMapSpots={mapData.spots}
        liveMapEditBasePath={mapData.editBasePath}
        activeParadeLabel={mapData.eventName}
      />
    </AppShell>
  );
}
