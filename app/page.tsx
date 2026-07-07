import { AppShell } from "@/components/layout/AppShell";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { getMissionControlMapData } from "@/lib/data/missionControl";

export default async function Home() {
  const mapData = await getMissionControlMapData();

  return (
    <AppShell>
      <MissionControlConsole
        view="combined"
        liveMapSpots={mapData.spots}
        liveMapEditBasePath={mapData.editBasePath}
        activeParadeLabel={mapData.eventName}
      />
    </AppShell>
  );
}
