import { getParticipantTokenPayload } from "@/lib/participantToken";
import { supabase } from "@/lib/supabase";

const FALLBACK_RELEASE_INTERVAL_SECONDS = 90;
const MAX_VALID_GAP_SECONDS = 10 * 60;
const MIN_VALID_GAP_SECONDS = 5;
const PAUSED_THRESHOLD_MS = 15 * 60 * 1000;

type EstimateState = "estimate" | "pushed_off" | "unavailable" | "paused";

type EntryRow = {
  id: string;
  event_id: string;
  parade_number: number | null;
  lineup_position: number | null;
  check_in_status: string | null;
  checked_in_at: string | null;
  pushed_off_at: string | null;
};

export type ParticipantPushOffEstimate = {
  state: EstimateState;
  unitsAhead: number | null;
  estimatedMinutes: number | null;
  releasePaceSeconds: number;
  usingFallbackPace: boolean;
  message: string;
};

function isMovingStatus(status: string | null | undefined) {
  return status === "moving" || status === "on_route";
}

function getPushOffTimestamp(entry: EntryRow) {
  if (entry.pushed_off_at) {
    return entry.pushed_off_at;
  }

  if (isMovingStatus(entry.check_in_status) && entry.checked_in_at) {
    return entry.checked_in_at;
  }

  return null;
}

function hasPushedOff(entry: EntryRow) {
  return Boolean(getPushOffTimestamp(entry));
}

function getEntryOrder(entry: EntryRow, orderField: "parade_number" | "lineup_position") {
  const value = entry[orderField];
  return typeof value === "number" ? value : null;
}

function buildEstimateResponse(input: {
  unitsAhead: number;
  releasePaceSeconds: number;
  usingFallbackPace: boolean;
}): ParticipantPushOffEstimate {
  const estimatedSeconds = input.unitsAhead * input.releasePaceSeconds;
  const estimatedMinutes = Math.max(0, Math.ceil(estimatedSeconds / 60));

  return {
    state: "estimate",
    unitsAhead: input.unitsAhead,
    estimatedMinutes,
    releasePaceSeconds: Math.max(1, Math.round(input.releasePaceSeconds)),
    usingFallbackPace: input.usingFallbackPace,
    message: "Estimate updates automatically.",
  };
}

export async function getParticipantPushOffEstimateByToken(
  token: string
): Promise<ParticipantPushOffEstimate | null> {
  const payload = await getParticipantTokenPayload(token);

  if (!payload) {
    return null;
  }

  const { data: currentEntry, error: currentEntryError } = await supabase
    .from("entries")
    .select(
      "id, event_id, parade_number, lineup_position, check_in_status, checked_in_at, pushed_off_at"
    )
    .eq("id", payload.entryId)
    .single();

  if (currentEntryError || !currentEntry || currentEntry.event_id !== payload.eventId) {
    return null;
  }

  const typedCurrentEntry = currentEntry as EntryRow;

  if (hasPushedOff(typedCurrentEntry) || isMovingStatus(typedCurrentEntry.check_in_status)) {
    return {
      state: "pushed_off",
      unitsAhead: 0,
      estimatedMinutes: 0,
      releasePaceSeconds: FALLBACK_RELEASE_INTERVAL_SECONDS,
      usingFallbackPace: true,
      message: "Your parade unit has pushed off.",
    };
  }

  const orderField: "parade_number" | "lineup_position" | null =
    typeof typedCurrentEntry.parade_number === "number"
      ? "parade_number"
      : typeof typedCurrentEntry.lineup_position === "number"
        ? "lineup_position"
        : null;

  if (!orderField) {
    return {
      state: "unavailable",
      unitsAhead: null,
      estimatedMinutes: null,
      releasePaceSeconds: FALLBACK_RELEASE_INTERVAL_SECONDS,
      usingFallbackPace: true,
      message: "Estimate unavailable until lineup position is assigned.",
    };
  }

  const currentOrder = getEntryOrder(typedCurrentEntry, orderField);
  if (currentOrder === null) {
    return {
      state: "unavailable",
      unitsAhead: null,
      estimatedMinutes: null,
      releasePaceSeconds: FALLBACK_RELEASE_INTERVAL_SECONDS,
      usingFallbackPace: true,
      message: "Estimate unavailable until lineup position is assigned.",
    };
  }

  const { data: eventEntries, error: entriesError } = await supabase
    .from("entries")
    .select(
      "id, event_id, parade_number, lineup_position, check_in_status, checked_in_at, pushed_off_at"
    )
    .eq("event_id", payload.eventId);

  if (entriesError || !eventEntries) {
    return null;
  }

  const typedEntries = eventEntries as EntryRow[];

  const unitsAhead = typedEntries.filter((entry) => {
    const order = getEntryOrder(entry, orderField);
    return order !== null && order < currentOrder && !hasPushedOff(entry);
  }).length;

  const pushedOffEntries = typedEntries
    .map((entry) => {
      const timestamp = getPushOffTimestamp(entry);
      if (!timestamp) {
        return null;
      }

      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return {
        timestamp,
        millis: date.getTime(),
      };
    })
    .filter((value): value is { timestamp: string; millis: number } => Boolean(value))
    .sort((a, b) => b.millis - a.millis)
    .slice(0, 10);

  const latestPushOffMillis = pushedOffEntries[0]?.millis ?? null;
  const isPaused =
    unitsAhead > 0 &&
    (!latestPushOffMillis || Date.now() - latestPushOffMillis > PAUSED_THRESHOLD_MS);

  if (isPaused) {
    return {
      state: "paused",
      unitsAhead,
      estimatedMinutes: null,
      releasePaceSeconds: FALLBACK_RELEASE_INTERVAL_SECONDS,
      usingFallbackPace: true,
      message: "Push-off is currently paused. Mission Control will update this estimate.",
    };
  }

  let releasePaceSeconds = FALLBACK_RELEASE_INTERVAL_SECONDS;
  let usingFallbackPace = true;

  if (pushedOffEntries.length >= 2) {
    const chronological = [...pushedOffEntries].reverse();
    const validGapsSeconds: number[] = [];

    for (let index = 1; index < chronological.length; index += 1) {
      const gapSeconds =
        (chronological[index].millis - chronological[index - 1].millis) / 1000;

      if (
        Number.isFinite(gapSeconds) &&
        gapSeconds >= MIN_VALID_GAP_SECONDS &&
        gapSeconds <= MAX_VALID_GAP_SECONDS
      ) {
        validGapsSeconds.push(gapSeconds);
      }
    }

    if (validGapsSeconds.length >= 2) {
      const total = validGapsSeconds.reduce((sum, gap) => sum + gap, 0);
      releasePaceSeconds = total / validGapsSeconds.length;
      usingFallbackPace = false;
    }
  }

  return buildEstimateResponse({
    unitsAhead,
    releasePaceSeconds,
    usingFallbackPace,
  });
}
