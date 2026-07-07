"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { LiveStagingMap } from "@/components/maps/LiveStagingMap";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MissionControlMapSpot } from "@/lib/data/missionControl";

type MissionControlView = "combined" | "map" | "units" | "chat" | "queue";
type MissionControlPanelKey = Exclude<MissionControlView, "combined">;

type ParadeUnit = {
  id: string;
  name: string;
  organization: string;
  stagingSpot: string;
  crew: number;
  eta: string;
  status: "checked_in" | "staging" | "queued" | "departed";
};

type ChatMessage = {
  id: string;
  senderName: string;
  unitName: string | null;
  entryNumber: number | null;
  time: string;
  body: string;
  senderType: "coc" | "float" | "volunteer" | "system";
};

type MissionControlDbMessage = {
  id: string;
  senderName: string;
  senderType: "coc" | "float" | "volunteer" | "system";
  unitName: string | null;
  entryNumber: number | null;
  messageBody: string;
  createdAt: string;
};

type CommunicationsChannel =
  | "broadcast"
  | "parade_units"
  | "volunteers"
  | "section_captains";

type QueueItem = {
  id: string;
  title: string;
  owner: string;
  status: "pending" | "in_progress" | "ready" | "blocked";
  priority: "high" | "medium" | "low";
  details: string;
};

type MissionControlConsoleProps = {
  view?: MissionControlView;
  liveMapSpots?: MissionControlMapSpot[];
  liveMapEditBasePath?: string;
  activeParadeLabel?: string;
  communications?: {
    organizationId?: string;
    eventId?: string;
    messages?: MissionControlDbMessage[];
    sendMessageAction?: (formData: FormData) => void | Promise<void>;
  };
};

type DragAxis = "vertical" | "horizontal" | "units-bottom";

const WORKSPACE_SPLIT_STORAGE_KEY = "mission-control.workspace.splits.v3";

const panelRoutes: Record<MissionControlPanelKey, string> = {
  map: "/mission-control/map",
  units: "/mission-control/units",
  chat: "/mission-control/chat",
  queue: "/mission-control/queue",
};

const paradeUnits: ParadeUnit[] = [
  {
    id: "unit-1",
    name: "Grand Marshal Escort",
    organization: "City Parade Committee",
    stagingSpot: "A1",
    crew: 6,
    eta: "On site",
    status: "checked_in",
  },
  {
    id: "unit-2",
    name: "Community Float",
    organization: "Rainbow Alliance",
    stagingSpot: "B2",
    crew: 18,
    eta: "10 min",
    status: "staging",
  },
  {
    id: "unit-3",
    name: "Color Guard",
    organization: "North High School",
    stagingSpot: "C3",
    crew: 24,
    eta: "15 min",
    status: "queued",
  },
  {
    id: "unit-4",
    name: "Marching Band",
    organization: "Downtown Music Guild",
    stagingSpot: "D4",
    crew: 42,
    eta: "Ready",
    status: "checked_in",
  },
  {
    id: "unit-5",
    name: "Sponsor Vehicle",
    organization: "Parade Partners",
    stagingSpot: "E5",
    crew: 4,
    eta: "Delayed",
    status: "departed",
  },
  {
    id: "unit-6",
    name: "Emergency Unit",
    organization: "First Response Group",
    stagingSpot: "F6",
    crew: 3,
    eta: "On standby",
    status: "checked_in",
  },
];

const chatMessages: ChatMessage[] = [
  {
    id: "chat-1",
    senderName: "Joe Schmoe",
    unitName: "Nackte",
    entryNumber: 22,
    time: "10:42 AM",
    body: "I'm at my location but ran out of gas.",
    senderType: "float",
  },
  {
    id: "chat-2",
    senderName: "COC",
    unitName: null,
    entryNumber: null,
    time: "10:43 AM",
    body: "Copy @Nackte. Tow vehicle is on the way.",
    senderType: "coc",
  },
  {
    id: "chat-3",
    senderName: "John Doe",
    unitName: "Bears",
    entryNumber: 106,
    time: "10:44 AM",
    body: "Ready to push.",
    senderType: "volunteer",
  },
];

const communicationChannels: Array<{ key: CommunicationsChannel; label: string }> = [
  { key: "broadcast", label: "Broadcast" },
  { key: "parade_units", label: "Parade Units" },
  { key: "volunteers", label: "Volunteers" },
  { key: "section_captains", label: "Section Captains" },
];

const queueItems: QueueItem[] = [
  {
    id: "queue-1",
    title: "Release north staging lane",
    owner: "Route Control",
    status: "ready",
    priority: "high",
    details: "Move units A1 through C3 when the road marshal confirms.",
  },
  {
    id: "queue-2",
    title: "Confirm volunteer radio check",
    owner: "Support Desk",
    status: "in_progress",
    priority: "medium",
    details: "Await final confirmation from all zone leads.",
  },
  {
    id: "queue-3",
    title: "Brief escort vehicle on entry timing",
    owner: "VIP Desk",
    status: "pending",
    priority: "medium",
    details: "Keep the arrival window tightly coordinated.",
  },
  {
    id: "queue-4",
    title: "Hold parade start signal",
    owner: "Chief Marshal",
    status: "blocked",
    priority: "high",
    details: "Do not release until the south gate clears.",
  },
];

function panelShellClass(dedicated: boolean) {
  return dedicated
    ? "rounded-2xl border border-slate-800/70 bg-slate-900 px-1.5 py-2 shadow-2xl shadow-slate-950/35 md:px-1.5 md:py-2.5"
    : "rounded-2xl border border-slate-800/70 bg-slate-900 px-1 py-1.5 shadow-xl shadow-slate-950/25 md:px-1 md:py-2";
}

function priorityTone(priority: QueueItem["priority"]) {
  if (priority === "high") return "border-red-800 bg-red-950 text-red-300";
  if (priority === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function controlLinkClass() {
  return "inline-flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white";
}

function MissionControlMapPanel({
  dedicated,
  liveMapSpots,
  liveMapEditBasePath,
  activeParadeLabel,
}: {
  dedicated: boolean;
  liveMapSpots: MissionControlMapSpot[];
  liveMapEditBasePath?: string;
  activeParadeLabel?: string;
}) {
  const quickInfoCards = [
    { label: "Floats Checked In", value: "26" },
    { label: "Floats Missing", value: "7" },
    { label: "Volunteers Checked In", value: "84" },
    { label: "Volunteers Missing", value: "11" },
    { label: "Countdown to Push-Off", value: "00:18:40" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800/70">
        <LiveStagingMap spots={liveMapSpots} editBasePath={liveMapEditBasePath} fillHeight />
      </div>

      <div className={["grid gap-1.5", dedicated ? "md:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"].join(" ")}>
        {quickInfoCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-800/70 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
            <p className="mt-1 truncate font-semibold text-white">{card.value}</p>
          </article>
        ))}
      </div>

      {dedicated ? (
        <p className="text-[11px] text-slate-400">
          Active parade: {activeParadeLabel ?? "No active parade selected"} • Staging spots: {liveMapSpots.length}
        </p>
      ) : null}
    </div>
  );
}

function MissionControlUnitsPanel({ dedicated }: { dedicated: boolean }) {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/85">
      <div className="h-full min-h-0 overflow-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-left text-sm">
          <thead className="sticky top-0 bg-slate-950/95 text-slate-300 backdrop-blur">
            <tr>
              <th className="px-3 py-2.5 font-medium md:px-4">Unit</th>
              <th className="px-3 py-2.5 font-medium md:px-4">Organization</th>
              <th className="px-3 py-2.5 font-medium md:px-4">Staging</th>
              <th className="px-3 py-2.5 font-medium md:px-4">Crew</th>
              <th className="px-3 py-2.5 font-medium md:px-4">ETA</th>
              <th className="px-3 py-2.5 font-medium md:px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-slate-300">
            {paradeUnits.map((unit) => (
              <tr key={unit.id} className="align-top">
                <td className="px-3 py-2.5 font-semibold text-white md:px-4">{unit.name}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.organization}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.stagingSpot}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.crew}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.eta}</td>
                <td className="px-3 py-2.5 md:px-4">
                  <StatusBadge status={unit.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MissionControlChatPanelWithData({
  dedicated,
  communications,
}: {
  dedicated: boolean;
  communications?: MissionControlConsoleProps["communications"];
}) {
  const [selectedChannel, setSelectedChannel] = useState<CommunicationsChannel>("broadcast");
  const [showCreateChannelNotice, setShowCreateChannelNotice] = useState(false);

  const dbMessages = communications?.messages ?? [];
  const hasContext = Boolean(communications?.organizationId);
  const hasDbMessages = dbMessages.length > 0;

  const normalizedMessages = hasDbMessages
    ? dbMessages.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        senderType: message.senderType,
        unitName: message.unitName,
        entryNumber: message.entryNumber,
        body: message.messageBody,
        time: new Date(message.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      }))
    : chatMessages.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        senderType: message.senderType,
        unitName: message.unitName,
        entryNumber: message.entryNumber,
        body: message.body,
        time: message.time,
      }));

  const filteredMessages = normalizedMessages.filter((message) => {
    if (selectedChannel === "broadcast") {
      return true;
    }

    if (selectedChannel === "parade_units") {
      return message.senderType === "float";
    }

    if (selectedChannel === "volunteers") {
      return message.senderType === "volunteer";
    }

    return message.senderType === "coc";
  });

  const channelSenderType =
    selectedChannel === "parade_units"
      ? "float"
      : selectedChannel === "volunteers"
        ? "volunteer"
        : selectedChannel === "broadcast"
          ? "system"
          : "coc";

  const channelMessageType = selectedChannel === "broadcast" ? "system" : "chat";
  const channelSenderName = "COC";

  const handleComposeKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/85">
      <div className="shrink-0 border-b border-slate-800/70 p-2 md:px-3 md:py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {communicationChannels.map((channel) => (
            <button
              key={channel.key}
              type="button"
              onClick={() => setSelectedChannel(channel.key)}
              className={[
                "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition",
                selectedChannel === channel.key
                  ? "border-blue-400 bg-blue-500/20 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white",
              ].join(" ")}
            >
              {channel.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCreateChannelNotice(true)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Create channel"
          >
            +
          </button>
        </div>

        {showCreateChannelNotice ? (
          <p className="mt-2 text-sm text-slate-400">Additional channels coming soon.</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 md:px-3 md:py-2">
        <div className="rounded-lg border border-slate-800/70 bg-slate-950 p-3">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message, index) => {
              const titleParts = [
                message.senderName,
                message.unitName,
                message.entryNumber != null ? `#${message.entryNumber}` : null,
              ].filter((value): value is string => Boolean(value));

              return (
                <div key={message.id} className="py-1.5">
                  <p className="text-sm text-slate-400">{message.time}</p>
                  <p className="mt-1.5 font-semibold text-white">{titleParts.join(" — ")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.body}</p>
                  {index < filteredMessages.length - 1 ? (
                    <div className="mt-3 border-t border-slate-700" />
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">No messages in this channel.</p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-800/70 p-1.5 md:px-2 md:py-1.5">
        {hasContext && communications?.sendMessageAction ? (
          <form action={communications.sendMessageAction} className="rounded-md border border-slate-800/70 bg-slate-950 p-1.5">
            <input type="hidden" name="organizationId" value={communications.organizationId} />
            <input type="hidden" name="eventId" value={communications.eventId ?? ""} />
            <input type="hidden" name="senderType" value={channelSenderType} />
            <input type="hidden" name="messageType" value={channelMessageType} />
            <input type="hidden" name="senderName" value={channelSenderName} />

            <div className="flex items-center gap-1.5">
              <textarea
                name="messageBody"
                rows={1}
                placeholder="Send a message"
                onKeyDown={handleComposeKeyDown}
                className="h-8 min-h-8 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm leading-5 text-white"
                required
              />

              <button
                type="submit"
                className="inline-flex h-8 min-h-8 items-center rounded-md border border-blue-400 bg-blue-500 px-3 text-xs font-semibold text-white transition hover:bg-blue-400"
              >
                Send
              </button>
            </div>
          </form>
        ) : null}

        {!hasDbMessages ? (
          <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-900/60 p-3 text-sm text-slate-400">
            Sample fallback only when event/organization communications context is unavailable.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MissionControlQueuePanel({ dedicated }: { dedicated: boolean }) {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/85">
      <div className="h-full min-h-0 space-y-3 overflow-auto p-3 md:p-4">
        {queueItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">Owner: {item.owner}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${priorityTone(item.priority)}`}>
                  {item.priority} priority
                </span>
                <StatusBadge status={item.status} />
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.details}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function renderPanel(
  key: MissionControlPanelKey,
  dedicated: boolean,
  mapProps: {
    liveMapSpots: MissionControlMapSpot[];
    liveMapEditBasePath?: string;
    activeParadeLabel?: string;
  },
  communications?: MissionControlConsoleProps["communications"]
) {
  switch (key) {
    case "map":
      return (
        <MissionControlMapPanel
          dedicated={dedicated}
          liveMapSpots={mapProps.liveMapSpots}
          liveMapEditBasePath={mapProps.liveMapEditBasePath}
          activeParadeLabel={mapProps.activeParadeLabel}
        />
      );
    case "units":
      return <MissionControlUnitsPanel dedicated={dedicated} />;
    case "chat":
      return <MissionControlChatPanelWithData dedicated={dedicated} communications={communications} />;
    case "queue":
      return <MissionControlQueuePanel dedicated={dedicated} />;
  }
}

function MissionControlPanelShell({
  panel,
  dedicated,
  onFullScreen,
  active,
  liveMapSpots,
  liveMapEditBasePath,
  activeParadeLabel,
  communications,
}: {
  panel: MissionControlPanelKey;
  dedicated: boolean;
  onFullScreen?: (panel: MissionControlPanelKey) => void;
  active?: boolean;
  liveMapSpots?: MissionControlMapSpot[];
  liveMapEditBasePath?: string;
  activeParadeLabel?: string;
  communications?: MissionControlConsoleProps["communications"];
}) {
  const panelMeta: Record<MissionControlPanelKey, { title: string; icon: string }> = {
    map: { icon: "🗺", title: "Live Map" },
    chat: { icon: "💬", title: "Communications" },
    units: { icon: "📋", title: "Parade Units" },
    queue: { icon: "🚨", title: "Operations Feed" },
  };

  const header = panelMeta[panel];

  return (
    <section className={`${panelShellClass(dedicated)} flex h-full min-h-0 min-w-0 flex-col overflow-hidden`}>
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-800/70 px-0.5 pb-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm" aria-hidden="true">
            {header.icon}
          </span>
          <h3 className="truncate text-xs font-semibold text-white md:text-sm">{header.title}</h3>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={panelRoutes[panel]}
            className={controlLinkClass()}
            title="Open on Another Screen"
            aria-label="Open on Another Screen"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗
          </Link>
          <button
            type="button"
            onClick={() => onFullScreen?.(panel)}
            className={controlLinkClass()}
            title="Expand Panel"
            aria-label={active ? "Restore Panel" : "Expand Panel"}
          >
            ⛶
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-1">
        {renderPanel(panel, dedicated, {
          liveMapSpots: liveMapSpots ?? [],
          liveMapEditBasePath,
          activeParadeLabel,
        }, communications)}
      </div>
    </section>
  );
}

export function MissionControlConsole({
  view = "combined",
  liveMapSpots = [],
  liveMapEditBasePath,
  activeParadeLabel,
  communications,
}: MissionControlConsoleProps) {
  const [expandedPanel, setExpandedPanel] = useState<MissionControlPanelKey | null>(null);
  const [leftPanePercent, setLeftPanePercent] = useState(65);
  const [topPaneHeight, setTopPaneHeight] = useState(460);
  const [unitsPaneMinHeight, setUnitsPaneMinHeight] = useState(320);
  const [dragAxis, setDragAxis] = useState<DragAxis | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const unitsPaneRef = useRef<HTMLDivElement | null>(null);
  const isCombined = view === "combined";
  const focusedPanel = isCombined ? null : view;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(WORKSPACE_SPLIT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        leftPanePercent?: number;
        topPaneHeight?: number;
        unitsPaneMinHeight?: number;
        topPanePercent?: number;
      };

      if (typeof parsed.leftPanePercent === "number") {
        setLeftPanePercent(Math.min(75, Math.max(35, parsed.leftPanePercent)));
      }

      if (typeof parsed.topPaneHeight === "number") {
        setTopPaneHeight(Math.min(1400, Math.max(280, parsed.topPaneHeight)));
      } else if (typeof parsed.topPanePercent === "number") {
        const fallbackHeight = (parsed.topPanePercent / 100) * Math.max(window.innerHeight - 220, 420);
        setTopPaneHeight(Math.min(1400, Math.max(280, fallbackHeight)));
      }

      if (typeof parsed.unitsPaneMinHeight === "number") {
        setUnitsPaneMinHeight(Math.min(1800, Math.max(220, parsed.unitsPaneMinHeight)));
      }
    } catch {
      // Ignore malformed persisted values.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      WORKSPACE_SPLIT_STORAGE_KEY,
      JSON.stringify({ leftPanePercent, topPaneHeight, unitsPaneMinHeight })
    );
  }, [leftPanePercent, topPaneHeight, unitsPaneMinHeight]);

  useEffect(() => {
    if (!dragAxis) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }

      const rect = workspace.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      if (dragAxis === "vertical") {
        const ratio = ((event.clientX - rect.left) / rect.width) * 100;
        setLeftPanePercent(Math.min(75, Math.max(35, ratio)));
        return;
      }

      if (dragAxis === "units-bottom") {
        const unitsPane = unitsPaneRef.current;
        if (!unitsPane) {
          return;
        }

        const unitsRect = unitsPane.getBoundingClientRect();
        const nextHeight = event.clientY - unitsRect.top;
        setUnitsPaneMinHeight(Math.min(1800, Math.max(220, nextHeight)));
        return;
      }

      const nextHeight = event.clientY - rect.top;
      setTopPaneHeight(Math.min(1400, Math.max(280, nextHeight)));
    };

    const onPointerUp = () => {
      setDragAxis(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragAxis]);

  return (
    <div className="space-y-3">
      {isCombined ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">ParadeOne</p>
            <h1 className="text-lg font-semibold tracking-tight text-white md:text-xl">Mission Control</h1>
            <p className="max-w-3xl text-xs text-slate-300 md:text-sm">
              Command-room overview for live map visibility, communications, operations feed, and parade roster management.
            </p>
          </div>

          <div className="space-y-4 xl:hidden">
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <MissionControlPanelShell
                panel="map"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "map"}
                liveMapSpots={liveMapSpots}
                liveMapEditBasePath={liveMapEditBasePath}
                activeParadeLabel={activeParadeLabel}
              />

              <MissionControlPanelShell
                panel="chat"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "chat"}
                communications={communications}
              />
            </div>

            <MissionControlPanelShell
              panel="units"
              dedicated={false}
              onFullScreen={setExpandedPanel}
              active={expandedPanel === "units"}
            />
          </div>

          <div
            ref={workspaceRef}
            className={[
              "hidden min-h-0 xl:grid",
              dragAxis ? "select-none" : "",
            ].join(" ")}
            style={{
              gridTemplateColumns: `minmax(0, ${leftPanePercent}fr) 8px minmax(0, ${100 - leftPanePercent}fr)`,
              gridTemplateRows: `${topPaneHeight}px 8px minmax(${unitsPaneMinHeight}px, auto)`,
            }}
          >
            <div className="col-[1] row-[1] min-h-0 min-w-0 pr-0.5">
              <MissionControlPanelShell
                panel="map"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "map"}
                liveMapSpots={liveMapSpots}
                liveMapEditBasePath={liveMapEditBasePath}
                activeParadeLabel={activeParadeLabel}
              />
            </div>

            <button
              type="button"
              className="col-[2] row-[1] cursor-col-resize rounded bg-slate-800/80 transition hover:bg-blue-500/70"
              onPointerDown={() => setDragAxis("vertical")}
              aria-label="Resize live map and communications"
            />

            <div className="col-[3] row-[1] min-h-0 min-w-0 pl-0.5">
              <MissionControlPanelShell
                panel="chat"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "chat"}
                communications={communications}
              />
            </div>

            <button
              type="button"
              className="col-[1/4] row-[2] cursor-row-resize rounded bg-slate-800/80 transition hover:bg-blue-500/70"
              onPointerDown={() => setDragAxis("horizontal")}
              aria-label="Resize top panels and parade units"
            />

            <div ref={unitsPaneRef} className="col-[1/4] row-[3] min-h-0 min-w-0 pt-0.5">
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1">
                  <MissionControlPanelShell
                    panel="units"
                    dedicated={false}
                    onFullScreen={setExpandedPanel}
                    active={expandedPanel === "units"}
                  />
                </div>

                <button
                  type="button"
                  className="mt-1 h-2 w-full cursor-row-resize rounded bg-slate-800/80 transition hover:bg-blue-500/70"
                  onPointerDown={() => setDragAxis("units-bottom")}
                  aria-label="Resize parade units bottom edge"
                />
              </div>
            </div>
          </div>
        </div>
      ) : focusedPanel ? (
        <div className="min-h-[calc(100dvh-6.25rem)]">
          <div className="h-full min-h-0">
            <MissionControlPanelShell
              panel={focusedPanel}
              dedicated
              onFullScreen={setExpandedPanel}
              active={expandedPanel === focusedPanel}
              liveMapSpots={liveMapSpots}
              liveMapEditBasePath={liveMapEditBasePath}
              activeParadeLabel={activeParadeLabel}
              communications={communications}
            />
          </div>
        </div>
      ) : null}

      {expandedPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-3 md:p-6">
          <div className="flex h-full w-full max-w-7xl flex-col gap-3">
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setExpandedPanel(null)}>
                Close Full Screen
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950 shadow-2xl shadow-slate-950/70">
              {renderPanel(expandedPanel, true, {
                liveMapSpots,
                liveMapEditBasePath,
                activeParadeLabel,
              }, communications)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
