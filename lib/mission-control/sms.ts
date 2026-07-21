import { normalizePhoneNumber } from "@/lib/mission-control/communicationsDirectory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getPublicWebhookUrl,
  isTwilioConfigured,
  sendTwilioSms,
} from "@/lib/twilio";

type SmsChannel =
  | "broadcast"
  | "parade_units"
  | "volunteers"
  | "section_captains";

type SmsRecipient = {
  phone: string;
  participantId: string | null;
  paradeUnitId: string | null;
};

type ParticipantRow = {
  id: string;
  participant_type: "parade_unit" | "volunteer" | "section_captain";
  participant_phone: string;
  phone_normalized: string;
  parade_unit_id: string | null;
  is_active: boolean;
  sms_consent_status: "unknown" | "opted_in" | "opted_out";
  created_at: string;
};

type EntryRow = {
  id: string;
  contact_phone: string | null;
  sms_opt_in: boolean;
};

export type SmsDeliverySummary = {
  status: "queued" | "partial" | "failed" | "not_configured" | "no_recipients";
  attempted: number;
  queued: number;
  failed: number;
  message: string;
};

export type MessageSmsStatus = {
  status: "sending" | "delivered" | "partial" | "failed";
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
};

function isMissingSmsMigrationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("sms_deliveries") ||
    message.includes("sms_consent_status")
  );
}

async function listParticipantRows(input: {
  organizationId: string;
  eventId: string;
}): Promise<ParticipantRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("communication_participants")
    .select(
      "id, participant_type, participant_phone, phone_normalized, parade_unit_id, is_active, sms_consent_status, created_at"
    )
    .eq("organization_id", input.organizationId)
    .eq("event_id", input.eventId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSmsMigrationError(error)) {
      const fallback = await supabase
        .from("communication_participants")
        .select(
          "id, participant_type, participant_phone, phone_normalized, parade_unit_id, is_active, created_at"
        )
        .eq("organization_id", input.organizationId)
        .eq("event_id", input.eventId)
        .order("created_at", { ascending: false });

      if (fallback.error) throw new Error(fallback.error.message);

      return (fallback.data ?? []).map((row) => ({
        ...row,
        sms_consent_status: "unknown" as const,
      })) as ParticipantRow[];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ParticipantRow[];
}

async function listSmsRecipients(input: {
  organizationId: string;
  eventId: string;
  channel: SmsChannel;
  paradeUnitId?: string | null;
}): Promise<SmsRecipient[]> {
  const supabase = await createServerSupabaseClient();
  let entryQuery = supabase
    .from("entries")
    .select("id, contact_phone, sms_opt_in")
    .eq("event_id", input.eventId)
    .eq("sms_opt_in", true)
    .not("contact_phone", "is", null);

  if (input.paradeUnitId) {
    entryQuery = entryQuery.eq("id", input.paradeUnitId);
  }

  const [{ data: entryData, error: entryError }, participantRows] = await Promise.all([
    entryQuery,
    listParticipantRows(input),
  ]);

  if (entryError) throw new Error(entryError.message);

  const entries = (entryData ?? []) as EntryRow[];
  const latestParticipantByPhone = new Map<string, ParticipantRow>();
  const activeParticipantByEntry = new Map<string, ParticipantRow>();

  for (const participant of participantRows) {
    const phone = normalizePhoneNumber(
      participant.phone_normalized || participant.participant_phone || ""
    );
    if (phone && !latestParticipantByPhone.has(phone)) {
      latestParticipantByPhone.set(phone, participant);
    }
    if (
      participant.parade_unit_id &&
      participant.is_active &&
      !activeParticipantByEntry.has(participant.parade_unit_id)
    ) {
      activeParticipantByEntry.set(participant.parade_unit_id, participant);
    }
  }

  const recipients = new Map<string, SmsRecipient>();

  if (input.channel === "broadcast" || input.channel === "parade_units") {
    for (const entry of entries) {
      const participant = activeParticipantByEntry.get(entry.id) ?? null;
      const phone = normalizePhoneNumber(
        participant?.phone_normalized || participant?.participant_phone || entry.contact_phone || ""
      );
      const latestParticipant = latestParticipantByPhone.get(phone);

      if (
        !phone ||
        latestParticipant?.sms_consent_status === "opted_out" ||
        latestParticipant?.is_active === false
      ) {
        continue;
      }

      recipients.set(phone, {
        phone,
        participantId: participant?.id ?? null,
        paradeUnitId: entry.id,
      });
    }
  }

  if (!input.paradeUnitId) {
    const allowedTypes =
      input.channel === "broadcast"
        ? new Set(["parade_unit", "volunteer", "section_captain"])
        : input.channel === "volunteers"
          ? new Set(["volunteer"])
          : input.channel === "section_captains"
            ? new Set(["section_captain"])
            : new Set(["parade_unit"]);

    for (const participant of participantRows) {
      const phone = normalizePhoneNumber(
        participant.phone_normalized || participant.participant_phone || ""
      );

      if (
        !phone ||
        recipients.has(phone) ||
        !allowedTypes.has(participant.participant_type) ||
        !participant.is_active ||
        participant.sms_consent_status !== "opted_in"
      ) {
        continue;
      }

      recipients.set(phone, {
        phone,
        participantId: participant.id,
        paradeUnitId: participant.parade_unit_id,
      });
    }
  }

  return Array.from(recipients.values());
}

async function deliverRecipient(input: {
  organizationId: string;
  eventId: string;
  missionControlMessageId: string;
  messageBody: string;
  recipient: SmsRecipient;
}): Promise<"queued" | "failed"> {
  const supabase = await createServerSupabaseClient();
  const { data: delivery, error: deliveryError } = await supabase
    .from("sms_deliveries")
    .insert({
      organization_id: input.organizationId,
      event_id: input.eventId,
      mission_control_message_id: input.missionControlMessageId,
      communication_participant_id: input.recipient.participantId,
      parade_unit_id: input.recipient.paradeUnitId,
      to_phone: input.recipient.phone,
      provider_status: "queued",
    })
    .select("id")
    .single();

  if (deliveryError || !delivery) {
    throw new Error(
      isMissingSmsMigrationError(deliveryError)
        ? "SMS delivery tracking migration 022 has not been applied."
        : deliveryError?.message || "Unable to create SMS delivery record."
    );
  }

  try {
    const callbackPath = `/api/sms/status?deliveryId=${encodeURIComponent(delivery.id)}`;
    const result = await sendTwilioSms({
      to: input.recipient.phone,
      body: input.messageBody,
      statusCallbackUrl: getPublicWebhookUrl(callbackPath),
    });
    const sentAt = new Date().toISOString();

    await supabase
      .from("sms_deliveries")
      .update({
        provider_message_sid: result.sid,
        provider_status: result.status,
        sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", delivery.id);

    if (input.recipient.participantId) {
      await supabase
        .from("communication_participants")
        .update({ last_sms_sent_at: sentAt })
        .eq("id", input.recipient.participantId);
    }

    return "queued";
  } catch (error) {
    const failedAt = new Date().toISOString();
    await supabase
      .from("sms_deliveries")
      .update({
        provider_status: "failed",
        error_message: error instanceof Error ? error.message : "SMS sending failed.",
        failed_at: failedAt,
        updated_at: failedAt,
      })
      .eq("id", delivery.id);
    return "failed";
  }
}

export async function sendMissionControlSms(input: {
  organizationId: string;
  eventId: string;
  missionControlMessageId: string;
  messageBody: string;
  channel: SmsChannel;
  paradeUnitId?: string | null;
}): Promise<SmsDeliverySummary> {
  if (!isTwilioConfigured()) {
    return {
      status: "not_configured",
      attempted: 0,
      queued: 0,
      failed: 0,
      message: "Message saved in Mission Control, but Twilio is not configured.",
    };
  }

  const recipients = await listSmsRecipients(input);

  if (recipients.length === 0) {
    return {
      status: "no_recipients",
      attempted: 0,
      queued: 0,
      failed: 0,
      message: "Message saved, but no SMS-consented recipients matched this target.",
    };
  }

  let queued = 0;
  let failed = 0;
  let firstFailureMessage: string | null = null;

  for (let index = 0; index < recipients.length; index += 10) {
    const batch = recipients.slice(index, index + 10);
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        deliverRecipient({
          ...input,
          recipient,
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value === "queued") queued += 1;
      else {
        failed += 1;
        if (result.status === "rejected" && !firstFailureMessage) {
          firstFailureMessage =
            result.reason instanceof Error ? result.reason.message : "SMS delivery failed.";
        }
      }
    }
  }

  const status = failed === 0 ? "queued" : queued > 0 ? "partial" : "failed";
  return {
    status,
    attempted: recipients.length,
    queued,
    failed,
    message:
      failed === 0
        ? `${queued} SMS message${queued === 1 ? "" : "s"} queued for delivery.`
        : queued === 0 && firstFailureMessage
          ? firstFailureMessage
        : `${queued} SMS message${queued === 1 ? "" : "s"} queued; ${failed} failed.`,
  };
}

export async function listMessageSmsStatuses(
  messageIds: string[]
): Promise<Map<string, MessageSmsStatus>> {
  const statuses = new Map<string, MessageSmsStatus>();
  if (messageIds.length === 0) return statuses;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sms_deliveries")
    .select("mission_control_message_id, provider_status")
    .in("mission_control_message_id", messageIds);

  if (error) {
    if (isMissingSmsMigrationError(error)) return statuses;
    throw new Error(error.message);
  }

  const grouped = new Map<string, string[]>();
  for (const delivery of data ?? []) {
    if (!delivery.mission_control_message_id) continue;
    const current = grouped.get(delivery.mission_control_message_id) ?? [];
    current.push(String(delivery.provider_status || "queued").toLowerCase());
    grouped.set(delivery.mission_control_message_id, current);
  }

  for (const [messageId, deliveryStatuses] of grouped) {
    const deliveredCount = deliveryStatuses.filter((status) =>
      status === "delivered" || status === "read"
    ).length;
    const failedCount = deliveryStatuses.filter((status) =>
      status === "failed" || status === "undelivered"
    ).length;
    const pendingCount = deliveryStatuses.length - deliveredCount - failedCount;
    const status =
      failedCount === deliveryStatuses.length
        ? "failed"
        : failedCount > 0
          ? "partial"
          : pendingCount > 0
            ? "sending"
            : "delivered";

    statuses.set(messageId, {
      status,
      recipientCount: deliveryStatuses.length,
      deliveredCount,
      failedCount,
    });
  }

  return statuses;
}
