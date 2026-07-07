import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CommunicationsDirectoryIdentity = {
  participantId: string | null;
  organizationId: string;
  eventId: string | null;
  senderType: "parade_unit" | "volunteer" | "section_captain";
  senderName: string;
  senderPhone: string;
  paradeUnitId: string | null;
  volunteerId: string | null;
  unitName: string | null;
  entryNumber: number | null;
  displayLabel: string;
};

export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

function buildDisplayLabel(identity: {
  senderName: string;
  unitName: string | null;
  entryNumber: number | null;
}): string {
  const parts = [
    identity.senderName,
    identity.unitName,
    identity.entryNumber != null ? `#${identity.entryNumber}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" — ");
}

async function ensureParticipantFromEntry(identity: {
  organizationId: string;
  eventId: string | null;
  senderName: string;
  normalizedPhone: string;
  paradeUnitId: string | null;
  unitName: string | null;
  entryNumber: number | null;
}): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("communication_participants")
    .select("id")
    .eq("organization_id", identity.organizationId)
    .eq("event_id", identity.eventId)
    .eq("phone_normalized", identity.normalizedPhone)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("communication_participants")
    .insert({
      organization_id: identity.organizationId,
      event_id: identity.eventId,
      participant_type: "parade_unit",
      participant_name: identity.senderName,
      participant_phone: identity.normalizedPhone,
      phone_normalized: identity.normalizedPhone,
      parade_unit_id: identity.paradeUnitId,
      unit_name: identity.unitName,
      entry_number: identity.entryNumber,
      last_seen_phone: identity.normalizedPhone,
    })
    .select("id")
    .single();

  if (error) {
    return null;
  }

  return inserted?.id ?? null;
}

export async function lookupCommunicationsIdentityByPhone(
  phoneRaw: string
): Promise<CommunicationsDirectoryIdentity | null> {
  const normalizedPhone = normalizePhoneNumber(phoneRaw);
  if (!normalizedPhone) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data: participant } = await supabase
    .from("communication_participants")
    .select(
      "id, organization_id, event_id, participant_type, participant_name, participant_phone, parade_unit_id, volunteer_id, unit_name, entry_number"
    )
    .eq("phone_normalized", normalizedPhone)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (participant) {
    const senderName = participant.participant_name || "Unknown Sender";
    const unitName = participant.unit_name || null;
    const entryNumber =
      typeof participant.entry_number === "number" ? participant.entry_number : null;
    const senderType =
      participant.participant_type === "section_captain"
        ? "section_captain"
        : participant.participant_type === "volunteer"
          ? "volunteer"
          : "parade_unit";

    return {
      participantId: participant.id,
      organizationId: participant.organization_id,
      eventId: participant.event_id,
      senderType,
      senderName,
      senderPhone: participant.participant_phone || normalizedPhone,
      paradeUnitId: participant.parade_unit_id || null,
      volunteerId: participant.volunteer_id || null,
      unitName,
      entryNumber,
      displayLabel: buildDisplayLabel({ senderName, unitName, entryNumber }),
    };
  }

  const { data: entryCandidates } = await supabase
    .from("entries")
    .select(
      "id, event_id, name, contact_name, contact_phone, parade_number, events!inner(id, organization_id)"
    )
    .not("contact_phone", "is", null)
    .order("created_at", { ascending: false })
    .limit(250);

  const entry = (entryCandidates ?? []).find((candidate) => {
    const candidatePhone = normalizePhoneNumber(candidate.contact_phone || "");
    return candidatePhone === normalizedPhone;
  });

  if (!entry) {
    return null;
  }

  const event = Array.isArray(entry.events) ? entry.events[0] : entry.events;
  if (!event?.organization_id) {
    return null;
  }

  const senderName = entry.contact_name || entry.name || "Unknown Sender";
  const unitName = entry.name || null;
  const entryNumber =
    typeof entry.parade_number === "number" ? entry.parade_number : null;

  const participantId = await ensureParticipantFromEntry({
    organizationId: event.organization_id,
    eventId: entry.event_id,
    senderName,
    normalizedPhone,
    paradeUnitId: entry.id,
    unitName,
    entryNumber,
  });

  return {
    participantId,
    organizationId: event.organization_id,
    eventId: entry.event_id,
    senderType: "parade_unit",
    senderName,
    senderPhone: entry.contact_phone || normalizedPhone,
    paradeUnitId: entry.id,
    volunteerId: null,
    unitName,
    entryNumber,
    displayLabel: buildDisplayLabel({ senderName, unitName, entryNumber }),
  };
}

export async function recordInboundSmsForParticipant(
  participantId: string,
  normalizedPhone: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("communication_participants")
    .update({
      last_seen_phone: normalizedPhone,
      last_sms_received_at: new Date().toISOString(),
    })
    .eq("id", participantId);
}
