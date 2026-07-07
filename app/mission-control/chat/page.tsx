import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { sendMissionControlChatMessageAction } from "@/app/mission-control/actions";
import { getMissionControlMapData } from "@/lib/data/missionControl";
import { listMissionControlMessages } from "@/lib/mission-control/communications";

export default async function MissionControlChatPage() {
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
      <PageHeader
        eyebrow="Mission Control"
        title="Mission Control Chat"
        description="Dedicated command-room view for live operational communication with sample fallback when context is unavailable."
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
        view="chat"
        communications={{
          organizationId: mapData.organizationId,
          eventId: mapData.eventId,
          messages: messages.map((message) => ({
            id: message.id,
            senderName: message.sender_name || "COC",
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
