"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { LiveStagingMap } from "@/components/maps/LiveStagingMap";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MissionControlMapSpot } from "@/lib/data/missionControl";

type MissionControlView = "combined" | "map" | "units" | "chat" | "queue";
type MissionControlPanelKey = Exclude<MissionControlView, "combined">;

type MissionControlOperationalStatus =
  | "ready"
  | "getting_ready"
  | "moving"
  | "pushed_off"
  | "approaching_start"
  | "on_route"
  | "approaching_finish"
  | "completed"
  | "staged"
  | "needs_assistance"
  | "not_checked_in";

type ParadeUnit = {
  id: string;
  name: string;
  organization: string;
  stagingSpot: string;
  eta: string;
  entryNumber: number | null;
  status: MissionControlOperationalStatus;
  rawStatus: string | null;
};

type UnitSortKey = "name" | "organization" | "stagingSpot" | "entryNumber" | "eta" | "status";
type SortDirection = "ascending" | "descending";

type ChatMessage = {
  id: string;
  senderName: string;
  unitName: string | null;
  entryNumber: number | null;
  time: string;
  body: string;
  senderType: "coc" | "parade_unit" | "volunteer" | "section_captain";
  channel: CommunicationsChannel;
};

type MissionControlDbMessage = {
  id: string;
  senderName: string;
  senderType: "coc" | "parade_unit" | "volunteer" | "section_captain";
  channel: CommunicationsChannel;
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
  statusContext?: {
    organizationId?: string;
    eventId?: string;
  };
  communications?: {
    organizationId?: string;
    eventId?: string;
    messages?: MissionControlDbMessage[];
    sendMessageAction?: unknown;
  };
};

type DragAxis = "vertical" | "horizontal" | "units-bottom";

const desktopWorkspaceQuery = "(min-width: 1280px)";

function subscribeToDesktopWorkspace(onChange: () => void) {
  const mediaQuery = window.matchMedia(desktopWorkspaceQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopWorkspaceSnapshot() {
  return window.matchMedia(desktopWorkspaceQuery).matches;
}

function getDesktopWorkspaceServerSnapshot() {
  return false;
}

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
    eta: "On site",
    entryNumber: 11,
    status: "ready",
    rawStatus: "ready",
  },
  {
    id: "unit-2",
    name: "Community Float",
    organization: "Rainbow Alliance",
    stagingSpot: "B2",
    eta: "10 min",
    entryNumber: 22,
    status: "getting_ready",
    rawStatus: "getting_ready",
  },
  {
    id: "unit-3",
    name: "Color Guard",
    organization: "North High School",
    stagingSpot: "C3",
    eta: "15 min",
    entryNumber: 33,
    status: "getting_ready",
    rawStatus: "getting_ready",
  },
  {
    id: "unit-4",
    name: "Marching Band",
    organization: "Downtown Music Guild",
    stagingSpot: "D4",
    eta: "Ready",
    entryNumber: 44,
    status: "ready",
    rawStatus: "ready",
  },
  {
    id: "unit-5",
    name: "Sponsor Vehicle",
    organization: "Parade Partners",
    stagingSpot: "E5",
    eta: "Delayed",
    entryNumber: 55,
    status: "not_checked_in",
    rawStatus: "not_checked_in",
  },
  {
    id: "unit-6",
    name: "Emergency Unit",
    organization: "First Response Group",
    stagingSpot: "F6",
    eta: "On standby",
    entryNumber: 66,
    status: "needs_assistance",
    rawStatus: "needs_assistance",
  },
];

function toOperationalStatus(status: string | null | undefined): MissionControlOperationalStatus {
  if (!status) {
    return "not_checked_in";
  }

  if (status === "ready" || status === "checked_in") {
    return "ready";
  }

  if (status === "getting_ready" || status === "staging" || status === "queued") {
    return "getting_ready";
  }

  if (status === "moving" || status === "pushed_off" || status === "approaching_start" || status === "on_route" || status === "approaching_finish" || status === "completed" || status === "staged") {
    return status;
  }

  if (status === "needs_assistance") {
    return "needs_assistance";
  }

  return "not_checked_in";
}

const chatMessages: ChatMessage[] = [
  {
    id: "chat-1",
    senderName: "Joe Schmoe",
    unitName: "Nackte",
    entryNumber: 22,
    time: "10:42 AM",
    body: "I'm at my location but ran out of gas.",
    senderType: "parade_unit",
    channel: "parade_units",
  },
  {
    id: "chat-2",
    senderName: "COC",
    unitName: null,
    entryNumber: null,
    time: "10:43 AM",
    body: "Copy @Nackte. Tow vehicle is on the way.",
    senderType: "coc",
    channel: "broadcast",
  },
  {
    id: "chat-3",
    senderName: "John Doe",
    unitName: "Bears",
    entryNumber: 106,
    time: "10:44 AM",
    body: "Ready to push.",
    senderType: "volunteer",
    channel: "volunteers",
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
    ? "rounded-2xl border border-slate-700/80 bg-slate-800 px-1.5 py-2 shadow-2xl shadow-slate-950/25 md:px-1.5 md:py-2.5"
    : "rounded-2xl border border-slate-700/80 bg-slate-800 px-1 py-1.5 shadow-xl shadow-slate-950/20 md:px-1 md:py-2";
}

function priorityTone(priority: QueueItem["priority"]) {
  if (priority === "high") return "border-red-800 bg-red-950 text-red-300";
  if (priority === "medium") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-slate-600 bg-slate-800 text-slate-200";
}

function controlLinkClass() {
  return "inline-flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-100 transition hover:border-blue-400 hover:bg-slate-700 hover:text-white";
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
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700/80">
        <LiveStagingMap spots={liveMapSpots} editBasePath={liveMapEditBasePath} fillHeight />
      </div>

      <div className={["grid gap-1.5", dedicated ? "md:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"].join(" ")}>
        {quickInfoCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-700/80 bg-slate-800/90 px-2 py-1.5 text-xs text-slate-200">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
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

function MissionControlUnitsPanel({
  dedicated,
  liveMapSpots,
  statusContext,
  onStatusUpdate,
}: {
  dedicated: boolean;
  liveMapSpots: MissionControlMapSpot[];
  statusContext?: MissionControlConsoleProps["statusContext"];
  onStatusUpdate?: (update: {
    entryId?: string;
    entryNumber?: number;
    status: MissionControlOperationalStatus;
  }) => void;
}) {
  const [updatingEntryId, setUpdatingEntryId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowErrorEntryId, setRowErrorEntryId] = useState<string | null>(null);
  const [rowWarning, setRowWarning] = useState<string | null>(null);
  const [rowWarningEntryId, setRowWarningEntryId] = useState<string | null>(null);
  const [unitSort, setUnitSort] = useState<{
    key: UnitSortKey;
    direction: SortDirection;
  } | null>(null);

  const liveUnits: ParadeUnit[] = liveMapSpots.flatMap((spot) => {
    const entries = Array.isArray(spot.entries) ? spot.entries : [];

    return entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      organization: spot.section || "Field Unit",
      stagingSpot: spot.spot_code,
      eta: toOperationalStatus(entry.check_in_status) === "ready" ? "Ready" : "Pending",
      entryNumber: entry.parade_number,
      status: toOperationalStatus(entry.route_state !== "staged" ? entry.route_state : entry.pushed_off_at ? "pushed_off" : entry.check_in_status),
      rawStatus: entry.route_state !== "staged" ? entry.route_state : entry.pushed_off_at ? "pushed_off" : entry.check_in_status,
    }));
  });

  const units =
    liveUnits.length > 0
      ? liveUnits
      : paradeUnits.map((unit) => ({
          ...unit,
          rawStatus: unit.rawStatus ?? unit.status,
        }));

  const sortedUnits = unitSort
    ? units
        .map((unit, originalIndex) => ({ unit, originalIndex }))
        .sort((left, right) => {
          const leftValue = left.unit[unitSort.key];
          const rightValue = right.unit[unitSort.key];
          const leftMissing = leftValue === null || leftValue === undefined || leftValue === "";
          const rightMissing = rightValue === null || rightValue === undefined || rightValue === "";

          if (leftMissing !== rightMissing) {
            return leftMissing ? 1 : -1;
          }

          if (leftMissing && rightMissing) {
            return left.originalIndex - right.originalIndex;
          }

          const comparison =
            typeof leftValue === "number" && typeof rightValue === "number"
              ? leftValue - rightValue
              : String(leftValue).localeCompare(String(rightValue), undefined, {
                  numeric: true,
                  sensitivity: "base",
                });

          if (comparison === 0) {
            return left.originalIndex - right.originalIndex;
          }

          return unitSort.direction === "ascending" ? comparison : -comparison;
        })
        .map(({ unit }) => unit)
    : units;

  const toggleUnitSort = (key: UnitSortKey) => {
    setUnitSort((current) =>
      current?.key === key
        ? {
            key,
            direction: current.direction === "ascending" ? "descending" : "ascending",
          }
        : { key, direction: "ascending" }
    );
  };

  const sortableHeader = (key: UnitSortKey, label: string) => {
    const active = unitSort?.key === key;
    const ariaSort: "none" | SortDirection = active ? unitSort.direction : "none";

    return (
      <th aria-sort={ariaSort} className="px-3 py-2.5 font-medium md:px-4">
        <button
          type="button"
          onClick={() => toggleUnitSort(key)}
          className="inline-flex items-center gap-1.5 rounded text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span>{label}</span>
          <span aria-hidden="true" className={active ? "text-blue-300" : "text-slate-600"}>
            {active ? (unitSort.direction === "ascending" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  const canPushOff = (unit: ParadeUnit) => {
    if (unit.status !== "ready" && unit.status !== "getting_ready") {
      return false;
    }

    if (unit.rawStatus === "moving" || unit.rawStatus === "completed") {
      return false;
    }

    return Boolean(statusContext?.organizationId && statusContext?.eventId);
  };

  const handlePushOff = async (unit: ParadeUnit) => {
    if (!statusContext?.organizationId || !statusContext?.eventId || updatingEntryId) {
      return;
    }

    setUpdatingEntryId(unit.id);
    setRowError(null);
    setRowErrorEntryId(null);
    setRowWarning(null);
    setRowWarningEntryId(null);

    try {
      const response = await fetch("/api/mission-control/push-off", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: statusContext.organizationId,
          eventId: statusContext.eventId,
          entryId: unit.id,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok: true;
            entryId: string;
            status: MissionControlOperationalStatus;
            warning?: string;
          }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && !payload.ok && payload.error ? payload.error : "Unable to push off unit.");
      }

      onStatusUpdate?.({
        entryId: payload.entryId,
        status: payload.status,
      });

      if (payload.warning) {
        setRowWarning(payload.warning);
        setRowWarningEntryId(unit.id);
      }
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Unable to push off unit.");
      setRowErrorEntryId(unit.id);
    } finally {
      setUpdatingEntryId(null);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80">
      <div className="h-full min-h-0 overflow-auto">
        <table className="min-w-full divide-y divide-slate-700/70 text-left text-sm">
          <thead className="sticky top-0 bg-slate-800/95 text-slate-200 backdrop-blur">
            <tr>
              {sortableHeader("name", "Unit")}
              {sortableHeader("organization", "Section")}
              {sortableHeader("stagingSpot", "Staging")}
              {sortableHeader("entryNumber", "Entry #")}
              {sortableHeader("eta", "ETA")}
              {sortableHeader("status", "Status")}
              <th className="px-3 py-2.5 font-medium md:px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70 text-slate-200">
            {sortedUnits.map((unit) => (
              <tr key={unit.id} className="align-top bg-slate-900/25">
                <td className="px-3 py-2.5 font-semibold text-white md:px-4">{unit.name}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.organization}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.stagingSpot}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.entryNumber != null ? `#${unit.entryNumber}` : "-"}</td>
                <td className="px-3 py-2.5 md:px-4">{unit.eta}</td>
                <td className="px-3 py-2.5 md:px-4">
                  <StatusBadge status={unit.status} />
                </td>
                <td className="px-3 py-2.5 md:px-4">
                  {unit.status === "moving" || (unit.rawStatus !== null && ["pushed_off", "approaching_start", "on_route", "approaching_finish", "completed"].includes(unit.rawStatus)) ? (
                    <button type="button" disabled className="inline-flex items-center rounded border border-emerald-800 bg-emerald-950 px-2 py-1 text-xs font-semibold text-emerald-300 opacity-80">
                      Moving
                    </button>
                  ) : canPushOff(unit) ? (
                    <button
                      type="button"
                      onClick={() => void handlePushOff(unit)}
                      disabled={updatingEntryId === unit.id}
                      className="inline-flex items-center rounded border border-emerald-700 bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {updatingEntryId === unit.id ? "Pushing..." : "Push Off"}
                    </button>
                  ) : null}
                  {rowError && rowErrorEntryId === unit.id && updatingEntryId === null ? (
                    <p className="mt-1 text-xs text-red-300">{rowError}</p>
                  ) : null}
                  {rowWarning && rowWarningEntryId === unit.id && updatingEntryId === null ? (
                    <p className="mt-1 text-xs text-amber-300">{rowWarning}</p>
                  ) : null}
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
  liveMapSpots,
  communications,
  onStatusUpdate,
}: {
  dedicated: boolean;
  liveMapSpots: MissionControlMapSpot[];
  communications?: MissionControlConsoleProps["communications"];
  onStatusUpdate?: (update: {
    entryId?: string;
    entryNumber?: number;
    status: MissionControlOperationalStatus;
  }) => void;
}) {
  const [selectedChannel, setSelectedChannel] = useState<CommunicationsChannel>("broadcast");
  const [showCreateChannelNotice, setShowCreateChannelNotice] = useState(false);
  const incomingMessages = communications?.messages;
  const [messages, setMessages] = useState<MissionControlDbMessage[]>(incomingMessages ?? []);
  const [previousIncomingMessages, setPreviousIncomingMessages] = useState(incomingMessages);
  const [sendError, setSendError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [unitQuery, setUnitQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [unitResultsOpen, setUnitResultsOpen] = useState(false);
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const searchableUnits = liveMapSpots.flatMap((spot) =>
    (Array.isArray(spot.entries) ? spot.entries : []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      paradeNumber: entry.parade_number,
      section: spot.section,
      stagingSpot: spot.spot_code,
    }))
  );
  const normalizedUnitQuery = unitQuery.trim().toLocaleLowerCase();
  const matchingUnits = searchableUnits
    .filter((unit) => {
      if (!normalizedUnitQuery) return true;
      return (
        unit.name.toLocaleLowerCase().includes(normalizedUnitQuery) ||
        (unit.paradeNumber !== null && String(unit.paradeNumber).includes(normalizedUnitQuery))
      );
    })
    .slice(0, 8);

  const selectUnit = (unit: (typeof searchableUnits)[number]) => {
    setSelectedEntryId(unit.id);
    setUnitQuery(unit.name);
    setUnitResultsOpen(false);
    setActiveUnitIndex(0);
    setStatusError(null);
  };

  const handleUnitKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setUnitResultsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setUnitResultsOpen(true);
      setActiveUnitIndex((current) => {
        if (matchingUnits.length === 0) return 0;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        return (current + delta + matchingUnits.length) % matchingUnits.length;
      });
      return;
    }

    if (event.key === "Enter" && unitResultsOpen && matchingUnits[activeUnitIndex]) {
      event.preventDefault();
      selectUnit(matchingUnits[activeUnitIndex]);
    }
  };

  const hasContext = Boolean(communications?.organizationId);
  const hasDbMessages = messages.length > 0;
  const useSampleMessages = !hasContext && !hasDbMessages;

  if (previousIncomingMessages !== incomingMessages) {
    setPreviousIncomingMessages(incomingMessages);
    setMessages(incomingMessages ?? []);
  }

  const normalizedMessages = hasDbMessages
    ? messages.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        senderType: message.senderType,
        channel: message.channel,
        unitName: message.unitName,
        entryNumber: message.entryNumber,
        body: message.messageBody,
        time: new Date(message.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      }))
    : useSampleMessages
      ? chatMessages.map((message) => ({
          id: message.id,
          senderName: message.senderName,
          senderType: message.senderType,
          channel: message.channel,
          unitName: message.unitName,
          entryNumber: message.entryNumber,
          body: message.body,
          time: message.time,
        }))
      : [];

  const filteredMessages = normalizedMessages.filter((message) => {
    if (selectedChannel === "broadcast") {
      return message.channel === "broadcast";
    }

    return message.channel === selectedChannel;
  });

  const channelMessageType = selectedChannel === "broadcast" ? "system" : "chat";
  const channelSenderName = "COC";

  const handleComposeKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [selectedChannel, filteredMessages.length]);

  const handleComposeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!communications?.organizationId || isSending) {
      return;
    }

    const formData = new FormData(form);
    const messageBody = String(formData.get("messageBody") || "").trim();

    if (!messageBody) {
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const response = await fetch("/api/mission-control/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: communications.organizationId,
          eventId: communications.eventId ?? "",
          channel: selectedChannel,
          senderType: "coc",
          messageType: channelMessageType,
          senderName: channelSenderName,
          messageBody,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; message: MissionControlDbMessage }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && !payload.ok && payload.error ? payload.error : "Unable to send message.");
      }

      setMessages((current) => [...current, payload.message]);
  form.reset();
      textareaRef.current?.focus();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const applyStatusUpdate = async (status: MissionControlOperationalStatus) => {
    if (!communications?.organizationId || !communications?.eventId || isUpdatingStatus) {
      return;
    }

    if (!selectedEntryId) {
      setStatusError("Select a parade unit before setting a status.");
      return;
    }

    setStatusError(null);
    setIsUpdatingStatus(true);

    try {
      const response = await fetch("/api/mission-control/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: communications.organizationId,
          eventId: communications.eventId,
          entryId: selectedEntryId,
          status,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; entryId: string; entryNumber: number | null; status: MissionControlOperationalStatus }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && !payload.ok && payload.error ? payload.error : "Unable to update status.");
      }

      onStatusUpdate?.({
        entryId: payload.entryId,
        status: payload.status,
      });
      setSelectedEntryId(null);
      setUnitQuery("");
      setUnitResultsOpen(false);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80">
      <div className="shrink-0 border-b border-slate-700/80 p-2 md:px-3 md:py-2">
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
                  : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400 hover:bg-slate-700 hover:text-white",
              ].join(" ")}
            >
              {channel.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCreateChannelNotice(true)}
            className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Create channel"
          >
            +
          </button>
        </div>

        {showCreateChannelNotice ? (
          <p className="mt-2 text-sm text-slate-400">Additional channels coming soon.</p>
        ) : null}
      </div>

      <div ref={messageListRef} className="min-h-0 flex-1 overflow-auto p-2 md:px-3 md:py-2">
        <div className="min-h-full rounded-lg border border-slate-700/80 bg-slate-800/55 p-3">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message, index) => {
              const senderIdentity =
                message.entryNumber != null && message.unitName
                  ? `Float #${message.entryNumber} · ${message.unitName}`
                  : message.entryNumber != null
                    ? `Float #${message.entryNumber}`
                    : message.unitName
                      ? message.unitName
                      : message.senderName;

              return (
                <div key={message.id} className="py-1.5">
                  <p className="text-sm leading-6 text-slate-200">
                    <span className="text-xs text-slate-400">{message.time}</span>
                    <span className="mx-2 font-semibold text-white">{senderIdentity}</span>
                    <span>{`— ${message.body}`}</span>
                  </p>
                  {index < filteredMessages.length - 1 ? (
                    <div className="mt-3 border-t border-slate-700" />
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">
              {hasContext && !hasDbMessages ? "No messages yet." : "No messages in this channel."}
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-slate-700/80 bg-slate-800/95 p-1.5 backdrop-blur md:px-2 md:py-1.5">
        {hasContext ? (
          <form onSubmit={handleComposeSubmit} className="rounded-md border border-slate-700/80 bg-slate-800 p-1.5">
            <input type="hidden" name="organizationId" value={communications?.organizationId ?? ""} />
            <input type="hidden" name="eventId" value={communications?.eventId ?? ""} />
            <input type="hidden" name="channel" value={selectedChannel} />
            <input type="hidden" name="senderType" value="coc" />
            <input type="hidden" name="messageType" value={channelMessageType} />
            <input type="hidden" name="senderName" value={channelSenderName} />

            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-48 flex-1 sm:max-w-xs">
                <input
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={unitResultsOpen}
                  aria-controls="mission-control-unit-results"
                  aria-activedescendant={unitResultsOpen && matchingUnits[activeUnitIndex] ? `mission-control-unit-${matchingUnits[activeUnitIndex].id}` : undefined}
                  value={unitQuery}
                  onChange={(event) => {
                    setUnitQuery(event.target.value);
                    setSelectedEntryId(null);
                    setUnitResultsOpen(true);
                    setActiveUnitIndex(0);
                  }}
                  onFocus={() => setUnitResultsOpen(true)}
                  onBlur={() => setUnitResultsOpen(false)}
                  onKeyDown={handleUnitKeyDown}
                  placeholder="Search unit or parade #"
                  className="h-8 min-h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white"
                  disabled={isUpdatingStatus}
                />
                {unitResultsOpen ? (
                  <div id="mission-control-unit-results" role="listbox" className="absolute bottom-full left-0 z-30 mb-1 max-h-52 w-full overflow-auto rounded-md border border-slate-600 bg-slate-800 p-1 shadow-2xl shadow-slate-950/30">
                    {matchingUnits.length > 0 ? matchingUnits.map((unit, index) => (
                      <button
                        key={unit.id}
                        id={`mission-control-unit-${unit.id}`}
                        type="button"
                        role="option"
                        aria-selected={selectedEntryId === unit.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectUnit(unit)}
                        className={["block w-full rounded px-2 py-1.5 text-left text-xs", index === activeUnitIndex ? "bg-blue-600 text-white" : "text-slate-200 hover:bg-slate-800"].join(" ")}
                      >
                        <span className="block font-semibold">{unit.name}</span>
                        <span className="block text-[11px] opacity-75">
                          {unit.paradeNumber !== null ? `#${unit.paradeNumber}` : "No parade number"} · {unit.section || "No section"} · {unit.stagingSpot}
                        </span>
                      </button>
                    )) : (
                      <p className="px-2 py-2 text-xs text-slate-400">No matching units.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => applyStatusUpdate("ready")}
                className="inline-flex h-8 min-h-8 items-center rounded-md border border-green-700 bg-green-600 px-2.5 text-xs font-semibold text-white transition hover:bg-green-500"
                disabled={isUpdatingStatus}
              >
                Green / Ready
              </button>
              <button
                type="button"
                onClick={() => applyStatusUpdate("getting_ready")}
                className="inline-flex h-8 min-h-8 items-center rounded-md border border-yellow-400 bg-yellow-300 px-2.5 text-xs font-semibold text-slate-950 transition hover:bg-yellow-200"
                disabled={isUpdatingStatus}
              >
                Yellow / Getting Ready
              </button>
              <button
                type="button"
                onClick={() => applyStatusUpdate("needs_assistance")}
                className="inline-flex h-8 min-h-8 items-center rounded-md border border-red-700 bg-red-600 px-2.5 text-xs font-semibold text-white transition hover:bg-red-500"
                disabled={isUpdatingStatus}
              >
                Red / Need Assistance
              </button>
              <select
                aria-label="Manual route-state override"
                defaultValue=""
                disabled={isUpdatingStatus}
                onChange={(event) => {
                  const status = event.target.value as MissionControlOperationalStatus;
                  if (status) void applyStatusUpdate(status);
                  event.currentTarget.value = "";
                }}
                className="h-8 min-h-8 rounded-md border border-sky-700 bg-slate-900 px-2 text-xs font-semibold text-sky-100"
              >
                <option value="">Override route state…</option>
                <option value="staged">Staged</option>
                <option value="pushed_off">Pushed Off</option>
                <option value="approaching_start">Approaching Start</option>
                <option value="on_route">On Route</option>
                <option value="approaching_finish">Approaching Finish</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <textarea
                ref={textareaRef}
                name="messageBody"
                rows={1}
                placeholder="Send a message"
                onKeyDown={handleComposeKeyDown}
                className="h-8 min-h-8 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm leading-5 text-white"
                disabled={isSending}
                required
              />

              <button
                type="submit"
                className="inline-flex h-8 min-h-8 items-center rounded-md border border-blue-400 bg-blue-500 px-3 text-xs font-semibold text-white transition hover:bg-blue-400"
                disabled={isSending}
              >
                {isSending ? "Sending" : "Send"}
              </button>
            </div>
          </form>
        ) : null}

        {sendError ? (
          <p className="mt-2 text-xs text-red-300">{sendError}</p>
        ) : null}

        {statusError ? <p className="mt-2 text-xs text-red-300">{statusError}</p> : null}

        {useSampleMessages ? (
          <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/80 p-3 text-sm text-slate-300">
            Sample fallback only when event/organization communications context is unavailable.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MissionControlQueuePanel({ dedicated }: { dedicated: boolean }) {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/80">
      <div className="h-full min-h-0 space-y-3 overflow-auto p-3 md:p-4">
        {queueItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-700/80 bg-slate-800/90 p-3">
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
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.details}</p>
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
  statusContext?: MissionControlConsoleProps["statusContext"],
  communications?: MissionControlConsoleProps["communications"],
  onStatusUpdate?: (update: {
    entryId?: string;
    entryNumber?: number;
    status: MissionControlOperationalStatus;
  }) => void
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
      return (
        <MissionControlUnitsPanel
          dedicated={dedicated}
          liveMapSpots={mapProps.liveMapSpots}
          statusContext={statusContext}
          onStatusUpdate={onStatusUpdate}
        />
      );
    case "chat":
      return (
        <MissionControlChatPanelWithData
          dedicated={dedicated}
          liveMapSpots={mapProps.liveMapSpots}
          communications={communications}
          onStatusUpdate={onStatusUpdate}
        />
      );
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
  statusContext,
  onStatusUpdate,
}: {
  panel: MissionControlPanelKey;
  dedicated: boolean;
  onFullScreen?: (panel: MissionControlPanelKey) => void;
  active?: boolean;
  liveMapSpots?: MissionControlMapSpot[];
  liveMapEditBasePath?: string;
  activeParadeLabel?: string;
  communications?: MissionControlConsoleProps["communications"];
  statusContext?: MissionControlConsoleProps["statusContext"];
  onStatusUpdate?: (update: {
    entryId?: string;
    entryNumber?: number;
    status: MissionControlOperationalStatus;
  }) => void;
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
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-700/80 px-0.5 pb-1.5">
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
        }, statusContext, communications, onStatusUpdate)}
      </div>
    </section>
  );
}

export function MissionControlConsole({
  view = "combined",
  liveMapSpots = [],
  liveMapEditBasePath,
  activeParadeLabel,
  statusContext,
  communications,
}: MissionControlConsoleProps) {
  const [runtimeSpots, setRuntimeSpots] = useState<MissionControlMapSpot[]>(liveMapSpots);
  const [previousLiveMapSpots, setPreviousLiveMapSpots] = useState(liveMapSpots);
  const [expandedPanel, setExpandedPanel] = useState<MissionControlPanelKey | null>(null);
  const [leftPanePercent, setLeftPanePercent] = useState(65);
  const [topPaneHeight, setTopPaneHeight] = useState(460);
  const [unitsPaneMinHeight, setUnitsPaneMinHeight] = useState(320);
  const [dragAxis, setDragAxis] = useState<DragAxis | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const unitsPaneRef = useRef<HTMLDivElement | null>(null);
  const isCombined = view === "combined";
  const isDesktopWorkspace = useSyncExternalStore(
    subscribeToDesktopWorkspace,
    getDesktopWorkspaceSnapshot,
    getDesktopWorkspaceServerSnapshot
  );
  const mapIsExpanded = expandedPanel === "map";
  const focusedPanel = isCombined ? null : view;
  const statusOrganizationId = statusContext?.organizationId ?? communications?.organizationId;
  const statusEventId = statusContext?.eventId ?? communications?.eventId;

  if (previousLiveMapSpots !== liveMapSpots) {
    setPreviousLiveMapSpots(liveMapSpots);
    setRuntimeSpots(liveMapSpots);
  }

  useEffect(() => {
    if (!statusOrganizationId || !statusEventId) {
      return;
    }

    let isCancelled = false;

    const pollStatuses = async () => {
      const response = await fetch(
        `/api/mission-control/status?organizationId=${encodeURIComponent(statusOrganizationId)}&eventId=${encodeURIComponent(statusEventId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      ).catch(() => null);

      if (!response || !response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            ok: true;
            statuses: Array<{
              id: string;
              paradeNumber: number | null;
              checkInStatus: string | null;
              checkedInAt: string | null;
              pushedOffAt: string | null;
              routeState: string;
            }>;
          }
        | { ok: false; error?: string }
        | null;

      if (isCancelled || !payload || !payload.ok) {
        return;
      }

      const statusByEntryId = new Map(
        payload.statuses.map((entryStatus) => [entryStatus.id, entryStatus])
      );

      setRuntimeSpots((current) => {
        let changed = false;

        const next = current.map((spot) => {
          if (!Array.isArray(spot.entries) || spot.entries.length === 0) {
            return spot;
          }

          let spotChanged = false;
          const nextEntries = spot.entries.map((entry) => {
            const liveStatus = statusByEntryId.get(entry.id);
            if (!liveStatus || (entry.check_in_status === liveStatus.checkInStatus && entry.route_state === liveStatus.routeState)) {
              return entry;
            }

            spotChanged = true;
            changed = true;

            return {
              ...entry,
              check_in_status: liveStatus.checkInStatus,
              route_state: liveStatus.routeState,
            };
          });

          return spotChanged
            ? {
                  id: spot.id,
                  spot_code: spot.spot_code,
                  section: spot.section,
                  street_name: spot.street_name,
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                  entries: nextEntries,
                }
            : spot;
        });

        return changed ? next : current;
      });
    };

    void pollStatuses();
    const timer = window.setInterval(() => {
      void pollStatuses();
    }, 4000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [statusOrganizationId, statusEventId]);

  const handleStatusUpdate = (update: {
    entryId?: string;
    entryNumber?: number;
    status: MissionControlOperationalStatus;
  }) => {
    setRuntimeSpots((current) =>
      current.map((spot) => {
        if (!Array.isArray(spot.entries) || spot.entries.length === 0) {
          return spot;
        }

        let spotChanged = false;
        const updatedEntries = spot.entries.map((entry) => {
          const matches = update.entryId
            ? entry.id === update.entryId
            : entry.parade_number === update.entryNumber;

          if (!matches || entry.check_in_status === update.status) {
            return entry;
          }

          spotChanged = true;
          return { ...entry, check_in_status: update.status };
        });

        if (!spotChanged) {
          return spot;
        }

        return {
          id: spot.id,
          spot_code: spot.spot_code,
          section: spot.section,
          street_name: spot.street_name,
          latitude: spot.latitude,
          longitude: spot.longitude,
          entries: updatedEntries,
        };

      })
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    queueMicrotask(() => {
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
    });
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
            <p className="max-w-3xl text-xs text-slate-200 md:text-sm">
              Command-room overview for live map visibility, communications, operations feed, and parade roster management.
            </p>
          </div>

          {!isDesktopWorkspace && !mapIsExpanded ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <MissionControlPanelShell
                panel="map"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={false}
                liveMapSpots={runtimeSpots}
                liveMapEditBasePath={liveMapEditBasePath}
                activeParadeLabel={activeParadeLabel}
                statusContext={statusContext}
                onStatusUpdate={handleStatusUpdate}
              />

              <MissionControlPanelShell
                panel="chat"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "chat"}
                liveMapSpots={runtimeSpots}
                statusContext={statusContext}
                communications={communications}
                onStatusUpdate={handleStatusUpdate}
              />
            </div>

            <MissionControlPanelShell
              panel="units"
              dedicated={false}
              onFullScreen={setExpandedPanel}
              active={expandedPanel === "units"}
              liveMapSpots={runtimeSpots}
              statusContext={statusContext}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
          ) : null}

          {isDesktopWorkspace && !mapIsExpanded ? (
          <div
            ref={workspaceRef}
            className={[
              "grid min-h-0",
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
                active={false}
                liveMapSpots={runtimeSpots}
                liveMapEditBasePath={liveMapEditBasePath}
                activeParadeLabel={activeParadeLabel}
                statusContext={statusContext}
                onStatusUpdate={handleStatusUpdate}
              />
            </div>

            <button
              type="button"
              className="col-[2] row-[1] cursor-col-resize rounded bg-slate-700/80 transition hover:bg-blue-500/70"
              onPointerDown={() => setDragAxis("vertical")}
              aria-label="Resize live map and communications"
            />

            <div className="col-[3] row-[1] min-h-0 min-w-0 pl-0.5">
              <MissionControlPanelShell
                panel="chat"
                dedicated={false}
                onFullScreen={setExpandedPanel}
                active={expandedPanel === "chat"}
                liveMapSpots={runtimeSpots}
                statusContext={statusContext}
                communications={communications}
                onStatusUpdate={handleStatusUpdate}
              />
            </div>

            <button
              type="button"
              className="col-[1/4] row-[2] cursor-row-resize rounded bg-slate-700/80 transition hover:bg-blue-500/70"
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
                    liveMapSpots={runtimeSpots}
                    statusContext={statusContext}
                    onStatusUpdate={handleStatusUpdate}
                  />
                </div>

                <button
                  type="button"
                  className="mt-1 h-2 w-full cursor-row-resize rounded bg-slate-700/80 transition hover:bg-blue-500/70"
                  onPointerDown={() => setDragAxis("units-bottom")}
                  aria-label="Resize parade units bottom edge"
                />
              </div>
            </div>
          </div>
          ) : null}
        </div>
      ) : focusedPanel && !mapIsExpanded ? (
        <div className="h-[calc(100dvh-6.25rem)] min-h-0">
          <div className="h-full min-h-0 overflow-hidden">
            <MissionControlPanelShell
              panel={focusedPanel}
              dedicated
              onFullScreen={setExpandedPanel}
              active={expandedPanel === focusedPanel}
              liveMapSpots={runtimeSpots}
              liveMapEditBasePath={liveMapEditBasePath}
              activeParadeLabel={activeParadeLabel}
              statusContext={statusContext}
              communications={communications}
              onStatusUpdate={handleStatusUpdate}
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
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-slate-950/55">
              <div className="h-full min-h-0 overflow-hidden p-1">
                <MissionControlPanelShell
                  panel={expandedPanel}
                  dedicated
                  onFullScreen={setExpandedPanel}
                  active
                  liveMapSpots={runtimeSpots}
                  liveMapEditBasePath={liveMapEditBasePath}
                  activeParadeLabel={activeParadeLabel}
                  statusContext={statusContext}
                  communications={communications}
                  onStatusUpdate={handleStatusUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
