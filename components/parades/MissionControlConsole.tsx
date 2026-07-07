"use client";

import Link from "next/link";
import { useState } from "react";

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
  sender: string;
  role: string;
  time: string;
  body: string;
};

type MissionControlDbMessage = {
  id: string;
  senderName: string;
  unitName: string | null;
  entryNumber: number | null;
  messageBody: string;
  createdAt: string;
};

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
    sender: "Dispatch",
    role: "Operations",
    time: "08:41",
    body: "All command-room lanes clear. Staging is holding steady.",
  },
  {
    id: "chat-2",
    sender: "Unit B2",
    role: "Float Lead",
    time: "08:45",
    body: "Crew is loaded and awaiting route release.",
  },
  {
    id: "chat-3",
    sender: "Route Control",
    role: "Mission Control",
    time: "08:48",
    body: "Keep D4 paused until the escort crosses the south gate.",
  },
  {
    id: "chat-4",
    sender: "Support",
    role: "Volunteer Ops",
    time: "08:51",
    body: "Water and radio batteries are at the east support lane.",
  },
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
    ? "rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-slate-950/40 md:p-5"
    : "rounded-3xl border border-slate-800 bg-slate-900 p-3 shadow-xl shadow-slate-950/30 md:p-4";
}

function priorityTone(priority: QueueItem["priority"]) {
  if (priority === "high") return "border-red-800 bg-red-950 text-red-300";
  if (priority === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function controlLinkClass() {
  return "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white";
}

function MissionControlMapPanel({
  liveMapSpots,
  liveMapEditBasePath,
  activeParadeLabel,
}: {
  liveMapSpots: MissionControlMapSpot[];
  liveMapEditBasePath?: string;
  activeParadeLabel?: string;
}) {
  const hasSpots = liveMapSpots.length > 0;

  return (
    <div className="space-y-4">
      <LiveStagingMap spots={liveMapSpots} editBasePath={liveMapEditBasePath} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Source</p>
          <p className="mt-2 font-semibold text-white">Shared Staging Live Map</p>
          <p className="mt-1">Reuses the map component and marker logic from staging.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active Parade</p>
          <p className="mt-2 font-semibold text-white">{activeParadeLabel ?? "No active parade selected"}</p>
          <p className="mt-1">{hasSpots ? `${liveMapSpots.length} staging spots loaded.` : "No staging spots loaded yet."}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Notes</p>
          <p className="mt-2 font-semibold text-white">Live GPS View</p>
          <p className="mt-1">No new map backend added. Uses existing staging experience.</p>
        </div>
      </div>
    </div>
  );
}

function MissionControlUnitsPanel({ dedicated }: { dedicated: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <div className={dedicated ? "max-h-[780px] overflow-auto" : "overflow-auto"}>
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="sticky top-0 bg-slate-950/95 text-slate-300 backdrop-blur">
            <tr>
              <th className="px-4 py-3 font-medium md:px-6">Unit</th>
              <th className="px-4 py-3 font-medium md:px-6">Organization</th>
              <th className="px-4 py-3 font-medium md:px-6">Staging</th>
              <th className="px-4 py-3 font-medium md:px-6">Crew</th>
              <th className="px-4 py-3 font-medium md:px-6">ETA</th>
              <th className="px-4 py-3 font-medium md:px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {paradeUnits.map((unit) => (
              <tr key={unit.id} className="align-top">
                <td className="px-4 py-3 font-semibold text-white md:px-6">{unit.name}</td>
                <td className="px-4 py-3 md:px-6">{unit.organization}</td>
                <td className="px-4 py-3 md:px-6">{unit.stagingSpot}</td>
                <td className="px-4 py-3 md:px-6">{unit.crew}</td>
                <td className="px-4 py-3 md:px-6">{unit.eta}</td>
                <td className="px-4 py-3 md:px-6">
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

function MissionControlChatPanel({ dedicated }: { dedicated: boolean }) {
  return (
    <MissionControlChatPanelWithData dedicated={dedicated} />
  );
}

function MissionControlChatPanelWithData({
  dedicated,
  communications,
}: {
  dedicated: boolean;
  communications?: MissionControlConsoleProps["communications"];
}) {
  const dbMessages = communications?.messages ?? [];
  const hasContext = Boolean(communications?.organizationId);
  const hasDbMessages = dbMessages.length > 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950">
      <div className={dedicated ? "space-y-4 p-4 md:p-6 lg:max-h-[700px] lg:overflow-auto" : "space-y-4 p-4 md:p-6"}>
        {hasDbMessages
          ? dbMessages.map((message) => {
              const titleParts = [
                message.senderName,
                message.unitName,
                message.entryNumber != null ? String(message.entryNumber) : null,
              ].filter((value): value is string => Boolean(value));

              return (
                <article key={message.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-white">{titleParts.join(" — ")}</p>
                    <span className="text-xs text-slate-500">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{message.messageBody}</p>
                </article>
              );
            })
          : chatMessages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{message.sender}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{message.role}</p>
                  </div>
                  <span className="text-xs text-slate-500">{message.time}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{message.body}</p>
              </article>
            ))}

        {hasContext && communications?.sendMessageAction ? (
          <form action={communications.sendMessageAction} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <input type="hidden" name="organizationId" value={communications.organizationId} />
            <input type="hidden" name="eventId" value={communications.eventId ?? ""} />

            <div className="grid gap-3 md:grid-cols-3">
              <input
                name="senderName"
                placeholder="Joe Schmoe"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                required
              />
              <input
                name="unitName"
                placeholder="Nackte"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                name="entryNumber"
                type="number"
                min="1"
                placeholder="22"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <textarea
              name="messageBody"
              rows={3}
              placeholder="COC message"
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />

            <div className="mt-3 flex justify-end">
              <Button type="submit">Send</Button>
            </div>
          </form>
        ) : null}

        {!hasDbMessages ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            Sample fallback only when event/organization communications context is unavailable.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MissionControlQueuePanel({ dedicated }: { dedicated: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950">
      <div className={dedicated ? "space-y-4 p-4 md:p-6 lg:max-h-[700px] lg:overflow-auto" : "space-y-4 p-4 md:p-6"}>
        {queueItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">Owner: {item.owner}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${priorityTone(item.priority)}`}>
                  {item.priority} priority
                </span>
                <StatusBadge status={item.status} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.details}</p>
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
    <section className={panelShellClass(dedicated)}>
      <div className="mb-3 flex h-10 items-center justify-between border-b border-slate-800 px-1 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm" aria-hidden="true">
            {header.icon}
          </span>
          <h3 className="truncate text-sm font-semibold text-white">{header.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={panelRoutes[panel]}
            className={controlLinkClass()}
            title="Open on Another Screen"
            aria-label="Open on Another Screen"
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

      {renderPanel(panel, dedicated, {
        liveMapSpots: liveMapSpots ?? [],
        liveMapEditBasePath,
        activeParadeLabel,
      }, communications)}
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
  const isCombined = view === "combined";
  const focusedPanel = isCombined ? null : view;

  return (
    <div className="space-y-8">
      {isCombined ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">ParadeOne</p>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Mission Control</h1>
            <p className="max-w-3xl text-lg text-slate-300">
              Command-room overview for live map visibility, communications, operations feed, and parade roster management.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
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
              panel="queue"
              dedicated={false}
              onFullScreen={setExpandedPanel}
              active={expandedPanel === "queue"}
            />

            <MissionControlPanelShell
              panel="units"
              dedicated={false}
              onFullScreen={setExpandedPanel}
              active={expandedPanel === "units"}
            />
          </div>
        </div>
      ) : focusedPanel ? (
        <div className="space-y-6">
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
      ) : null}

      {expandedPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 md:p-8">
          <div className="flex h-full w-full max-w-7xl flex-col gap-4">
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setExpandedPanel(null)}>
                Close Full Screen
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/80">
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
