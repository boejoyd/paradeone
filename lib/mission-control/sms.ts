import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MissionControlChannel } from "@/lib/mission-control/communications";
import {
  normalizePhoneNumber,
  type SmsConsentStatus,
} from "@/lib/mission-control/communicationsDirectory";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTwilioSms } from "@/lib/twilio";

type SmsRecipient = {
  phone: string;
  participantId: string | null;
  paradeUnitId: string | null;
};

export type SmsSendSummary = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
};

type ParticipantRow = {
  id: string;
  participant_type: "parade_unit" | "volunteer" | "section_captain";
  participant_name: string;
  participant_phone: string;
  phone_normalized: string;
  parade_unit_id: string | null;
  sms_consent_status: SmsConsentStatus;
};

type EntryRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  parade_number: number | null;
  sms_opt_in: boolean;
};

function requireAdminClient(): SupabaseClient {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    throw new Error("SMS database access is not configured.");
  }

  return supabase;
}

function participantMatchesChannel(
  participant: ParticipantRow,
  channel: MissionControlChannel
): boolean {
  if (channel === "broadcast") {
    return true;
  }

  if (channel === "parade_units") {
    return participant.participant_type === "parade_unit";
  }

  if (channel === "volunteers") {
    return participant.participant_type === "volunteer";
  }

  return participant.participant_type === "section_captain";
}

async function ensureParticipantForEntry(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    eventId: string;
    entry: EntryRow;
    phone: string;
  }
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("communication_participants")
    .select("id, sms_consent_status")
    .eq("organization_id", input.organizationId)
    .eq("event_id", input.eventId)
    .eq("phone_normalized", input.phone)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    if (existing.sms_consent_status === "unknown") {
      await supabase
        .from("communication_participants")
        .update({
          sms_consent_status: "opted_in",
          sms_consent_updated_at: new Date().toISOString(),
          parade_unit_id: input.entry.id,
          unit_name: input.entry.name,
          entry_number: input.entry.parade_number,
        })
        .eq("id", existing.id);
    }

    return existing.sms_consent_status === "opted_out" ? null : existing.id;
  }

  const { data, error } = await supabase
    .from("communication_participants")
    .insert({
      organization_id: input.organizationId,
      event_id: input.eventId,
      participant_type: "parade_unit",
      participant_name: input.entry.contact_name || input.entry.name,
      participant_phone: input.phone,
      phone_normalized: input.phone,
      parade_unit_id: input.entry.id,
      unit_name: input.entry.name,
      entry_number: input.entry.parade_number,
      last_seen_phone: input.phone,
      sms_consent_status: "opted_in",
      sms_consent_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function resolveRecipients(input: {
  supabase: SupabaseClient;
  organizationId: string;
  eventId: string;
  channel: MissionControlChannel;
  paradeUnitId?: string | null;
}): Promise<{ recipients: SmsRecipient[]; skipped: number }> {
  const { data: participantData, error: participantError } = await input.supabase
    .from("communication_participants")
    .select(
      "id, participant_type, participant_name, participant_phone, phone_normalized, parade_unit_id, sms_consent_status"
    )
    .eq("organization_id", input.organizationId)
    .eq("event_id", input.eventId)
    .eq("is_active", true);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const participants = (participantData ?? []) as ParticipantRow[];
  const participantsByPhone = new Map(
    participants.map((participant) => [
      normalizePhoneNumber(participant.phone_normalized || participant.participant_phone),
      participant,
    ])
  );
  const recipients = new Map<string, SmsRecipient>();
  let skipped = 0;

  for (const participant of participants) {
    if (!participantMatchesChannel(participant, input.channel)) {
      continue;
    }
    if (input.paradeUnitId && participant.parade_unit_id !== input.paradeUnitId) {
      continue;
    }

    const phone = normalizePhoneNumber(
      participant.phone_normalized || participant.participant_phone
    );

    if (!phone || participant.sms_consent_status !== "opted_in") {
      skipped += 1;
      continue;
    }

    recipients.set(phone, {
      phone,
      participantId: participant.id,
      paradeUnitId: participant.parade_unit_id,
    });
  }

  if (input.channel === "broadcast" || input.channel === "parade_units") {
    let entryQuery = input.supabase
      .from("entries")
      .select("id, name, contact_name, contact_phone, parade_number, sms_opt_in")
      .eq("event_id", input.eventId)
      .eq("sms_opt_in", true)
      .neq("status", "rejected")
      .not("contact_phone", "is", null);

    if (input.paradeUnitId) {
      entryQuery = entryQuery.eq("id", input.paradeUnitId);
    }

    const { data: entryData, error: entryError } = await entryQuery;

    if (entryError) {
      throw new Error(entryError.message);
    }

    for (const entry of (entryData ?? []) as EntryRow[]) {
      const phone = normalizePhoneNumber(entry.contact_phone || "");
      const existingParticipant = participantsByPhone.get(phone);

      if (!phone || existingParticipant?.sms_consent_status === "opted_out") {
        skipped += 1;
        continue;
      }

      const participantId =
        existingParticipant?.id ??
        (await ensureParticipantForEntry(input.supabase, {
          organizationId: input.organizationId,
          eventId: input.eventId,
          entry,
          phone,
        }));

      if (!participantId) {
        skipped += 1;
        continue;
      }

      recipients.set(phone, {
        phone,
        participantId,
        paradeUnitId: entry.id,
      });
    }
  }

  return { recipients: [...recipients.values()], skipped };
}

export function getSmsStatusRank(status: string): number {
  const normalized = status.trim().toLowerCase();

  if (normalized === "accepted" || normalized === "scheduled") return 10;
  if (normalized === "queued") return 20;
  if (normalized === "sending") return 30;
  if (normalized === "sent") return 40;
  if (
    normalized === "delivered" ||
    normalized === "read" ||
    normalized === "failed" ||
    normalized === "undelivered" ||
    normalized === "canceled"
  ) {
    return 50;
  }

  return 0;
}

async function sendTrackedSms(input: {
  supabase: SupabaseClient;
  organizationId: string;
  eventId: string;
  missionControlMessageId: string;
  recipient: SmsRecipient;
  body: string;
}): Promise<void> {
  const providerMessage = await sendTwilioSms({
    to: input.recipient.phone,
    body: input.body,
  });

  const { error: deliveryError } = await input.supabase
    .from("sms_deliveries")
    .insert({
      organization_id: input.organizationId,
      event_id: input.eventId,
      mission_control_message_id: input.missionControlMessageId,
      communication_participant_id: input.recipient.participantId,
      parade_unit_id: input.recipient.paradeUnitId,
      recipient_phone: input.recipient.phone,
      provider_message_sid: providerMessage.sid,
      provider_status: providerMessage.status,
      status_rank: getSmsStatusRank(providerMessage.status),
    });

  if (deliveryError) {
    console.error("SMS was sent but delivery tracking could not be saved.", {
      providerMessageSid: providerMessage.sid,
      error: deliveryError.message,
    });
  }

  if (input.recipient.participantId) {
    const { error: participantError } = await input.supabase
      .from("communication_participants")
      .update({ last_sms_sent_at: new Date().toISOString() })
      .eq("id", input.recipient.participantId);

    if (participantError) {
      console.error("SMS participant timestamp could not be updated.", {
        participantId: input.recipient.participantId,
        error: participantError.message,
      });
    }
  }
}

export async function sendMissionControlSms(input: {
  organizationId: string;
  eventId: string;
  channel: MissionControlChannel;
  missionControlMessageId: string;
  body: string;
  paradeUnitId?: string | null;
}): Promise<SmsSendSummary> {
  const supabase = requireAdminClient();
  const { recipients, skipped } = await resolveRecipients({
    supabase,
    organizationId: input.organizationId,
    eventId: input.eventId,
    channel: input.channel,
    paradeUnitId: input.paradeUnitId,
  });

  let sent = 0;
  let failed = 0;
  const batchSize = 10;

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        sendTrackedSms({
          supabase,
          organizationId: input.organizationId,
          eventId: input.eventId,
          missionControlMessageId: input.missionControlMessageId,
          recipient,
          body: input.body,
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
      }
    }
  }

  return {
    attempted: recipients.length,
    sent,
    failed,
    skipped,
  };
}
