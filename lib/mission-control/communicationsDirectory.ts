import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SmsConsentStatus = "unknown" | "opted_in" | "opted_out";

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
  smsConsentStatus: SmsConsentStatus;
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
  smsOptIn: boolean;
}, databaseClient?: SupabaseClient): Promise<{
  id: string | null;
  smsConsentStatus: SmsConsentStatus;
}> {
  const supabase = databaseClient ?? (await createServerSupabaseClient());

  const { data: existing } = await supabase
    .from("communication_participants")
    .select("id, sms_consent_status")
    .eq("organization_id", identity.organizationId)
    .eq("event_id", identity.eventId)
    .eq("phone_normalized", identity.normalizedPhone)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    if (existing.sms_consent_status === "unknown" && identity.smsOptIn) {
      await supabase
        .from("communication_participants")
        .update({
          sms_consent_status: "opted_in",
          sms_consent_updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return { id: existing.id, smsConsentStatus: "opted_in" };
    }

    return {
      id: existing.id,
      smsConsentStatus:
        (existing.sms_consent_status as SmsConsentStatus | null) ?? "unknown",
    };
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
      sms_consent_status: identity.smsOptIn ? "opted_in" : "unknown",
      sms_consent_updated_at: identity.smsOptIn
        ? new Date().toISOString()
        : null,
    })
    .select("id, sms_consent_status")
    .single();

  if (error) {
    return { id: null, smsConsentStatus: identity.smsOptIn ? "opted_in" : "unknown" };
  }

  return {
    id: inserted?.id ?? null,
    smsConsentStatus:
      (inserted?.sms_consent_status as SmsConsentStatus | null) ??
      (identity.smsOptIn ? "opted_in" : "unknown"),
  };
}

export async function lookupCommunicationsIdentityByPhone(
  phoneRaw: string,
  databaseClient?: SupabaseClient
): Promise<CommunicationsDirectoryIdentity | null> {
  const normalizedPhone = normalizePhoneNumber(phoneRaw);
  if (!normalizedPhone) {
    return null;
  }

  const supabase = databaseClient ?? (await createServerSupabaseClient());

  const { data: participant } = await supabase
    .from("communication_participants")
    .select(
      "id, organization_id, event_id, participant_type, participant_name, participant_phone, parade_unit_id, volunteer_id, unit_name, entry_number, sms_consent_status"
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
      smsConsentStatus:
        (participant.sms_consent_status as SmsConsentStatus | null) ?? "unknown",
      displayLabel: buildDisplayLabel({ senderName, unitName, entryNumber }),
    };
  }

  const { data: entry } = await supabase
    .from("entries")
    .select(
      "id, event_id, name, contact_name, contact_phone, parade_number, sms_opt_in, events!inner(id, organization_id)"
    )
    .eq("contact_phone_normalized", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const ensuredParticipant = await ensureParticipantFromEntry(
    {
      organizationId: event.organization_id,
      eventId: entry.event_id,
      senderName,
      normalizedPhone,
      paradeUnitId: entry.id,
      unitName,
      entryNumber,
      smsOptIn: entry.sms_opt_in === true,
    },
    supabase
  );

  return {
    participantId: ensuredParticipant.id,
    organizationId: event.organization_id,
    eventId: entry.event_id,
    senderType: "parade_unit",
    senderName,
    senderPhone: entry.contact_phone || normalizedPhone,
    paradeUnitId: entry.id,
    volunteerId: null,
    unitName,
    entryNumber,
    smsConsentStatus: ensuredParticipant.smsConsentStatus,
    displayLabel: buildDisplayLabel({ senderName, unitName, entryNumber }),
  };
}

export async function recordInboundSmsForParticipant(
  participantId: string,
  normalizedPhone: string,
  databaseClient?: SupabaseClient
): Promise<void> {
  const supabase = databaseClient ?? (await createServerSupabaseClient());

  await supabase
    .from("communication_participants")
    .update({
      last_seen_phone: normalizedPhone,
      last_sms_received_at: new Date().toISOString(),
    })
    .eq("id", participantId);
}

export async function setParticipantSmsConsent(
  participantId: string,
  status: Extract<SmsConsentStatus, "opted_in" | "opted_out">,
  databaseClient?: SupabaseClient
): Promise<void> {
  const supabase = databaseClient ?? (await createServerSupabaseClient());

  const { error } = await supabase
    .from("communication_participants")
    .update({
      sms_consent_status: status,
      sms_consent_updated_at: new Date().toISOString(),
    })
    .eq("id", participantId);

  if (error) {
    throw new Error(error.message);
  }
}
