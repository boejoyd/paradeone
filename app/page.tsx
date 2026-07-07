import { AppShell } from "@/components/layout/AppShell";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { getMissionControlMapData } from "@/lib/data/missionControl";
import { listMissionControlMessages } from "@/lib/mission-control/communications";
import { sendMissionControlChatMessageAction } from "@/app/mission-control/actions";

export default async function Home() {
  const mapData = await getMissionControlMapData();
  const messages =
    mapData.organizationId && mapData.eventId
      ? await listMissionControlMessages({
          organizationId: mapData.organizationId,
          eventId: mapData.eventId,
        })
      : [];

  return (
    <AppShell>
      <MissionControlConsole
        view="combined"
        liveMapSpots={mapData.spots}
        liveMapEditBasePath={mapData.editBasePath}
        activeParadeLabel={mapData.eventName}
        communications={{
          organizationId: mapData.organizationId,
          eventId: mapData.eventId,
          messages: messages.map((message) => ({
            id: message.id,
            senderName: message.sender_name || "COC",
            senderType: message.sender_type,
            unitName: message.unit_name,
            entryNumber: message.entry_number,
            messageBody: message.message_body,
            createdAt: message.created_at,
          })),
          sendMessageAction: sendMissionControlChatMessageAction,
        }}
      />
    </AppShell>
  );
}
