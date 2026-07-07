import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
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
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Mission Control / Communications</p>
        <Link
          href="/"
          className="inline-flex rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
        >
          Back to Mission Control
        </Link>
      </div>

      <div className="min-h-[calc(100dvh-5.75rem)]">
        <MissionControlConsole
          view="chat"
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
      </div>
    </AppShell>
  );
}
