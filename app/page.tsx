import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/layout/EmptyState";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { getMissionControlMapData } from "@/lib/data/missionControl";
import { listMissionControlMessages } from "@/lib/mission-control/communications";
import { sendMissionControlChatMessageAction } from "@/app/mission-control/actions";

function toUiSenderType(senderType: string): "coc" | "parade_unit" | "volunteer" | "section_captain" {
  if (senderType === "parade_unit" || senderType === "volunteer" || senderType === "section_captain" || senderType === "coc") {
    return senderType;
  }

  if (senderType === "float") {
    return "parade_unit";
  }

  return "coc";
}

function toUiChannel(channel: string | null | undefined): "broadcast" | "parade_units" | "volunteers" | "section_captains" {
  if (channel === "broadcast" || channel === "parade_units" || channel === "volunteers" || channel === "section_captains") {
    return channel;
  }

  return "broadcast";
}

export default async function Home() {
  const mapData = await getMissionControlMapData();

  if (!mapData.hasOrganizationMembership) {
    return (
      <AppShell>
        <EmptyState
          title="No organization access"
          description="Create an organization or ask an owner to invite you."
          actionHref="/create-parade"
          actionLabel="Create Your First Parade"
        />
      </AppShell>
    );
  }

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
        statusContext={{
          organizationId: mapData.organizationId,
          eventId: mapData.eventId,
        }}
        communications={{
          organizationId: mapData.organizationId,
          eventId: mapData.eventId,
          messages: messages.map((message) => ({
            id: message.id,
            senderName: message.sender_name || "COC",
            senderType: toUiSenderType(message.sender_type),
            channel: toUiChannel(message.channel),
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
