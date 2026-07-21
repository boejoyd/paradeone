import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/layout/EmptyState";
import { MissionControlConsole } from "@/components/parades/MissionControlConsole";
import { getMissionControlMapData } from "@/lib/data/missionControl";
import { listMissionControlMessages } from "@/lib/mission-control/communications";

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

export default async function MissionControlChatPage() {
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

  if (!mapData.hasActiveParade) {
    return (
      <AppShell>
        <EmptyState title="No active parade selected" description="Choose a parade before opening communications." actionHref="/parades" actionLabel="Choose Active Parade" />
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
              senderType: toUiSenderType(message.sender_type),
              channel: toUiChannel(message.channel),
              unitName: message.unit_name,
              entryNumber: message.entry_number,
              messageBody: message.message_body,
              createdAt: message.created_at,
            })),
          }}
        />
      </div>
    </AppShell>
  );
}
