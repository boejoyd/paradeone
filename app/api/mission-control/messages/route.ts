import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isActiveParadeRequest } from "@/lib/activeParade.server";
import {
  listMissionControlMessages,
  sendMissionControlMessage,
  type MissionControlChannel,
  type MissionControlMessageType,
  type MissionControlSenderType,
} from "@/lib/mission-control/communications";
import {
  listMessageSmsStatuses,
  sendMissionControlSms,
  type MessageSmsStatus,
  type SmsDeliverySummary,
} from "@/lib/mission-control/sms";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SendMissionControlRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  channel?: unknown;
  paradeUnitId?: unknown;
  senderType?: unknown;
  messageType?: unknown;
  senderName?: unknown;
  messageBody?: unknown;
};

function parseChannel(value: unknown): MissionControlChannel {
  return value === "broadcast" ||
    value === "parade_units" ||
    value === "volunteers" ||
    value === "section_captains"
    ? value
    : "broadcast";
}

function parseSenderType(value: unknown): MissionControlSenderType {
  return value === "coc" ||
    value === "parade_unit" ||
    value === "volunteer" ||
    value === "section_captain"
    ? value
    : "coc";
}

function parseMessageType(value: unknown): MissionControlMessageType {
  return value === "chat" ||
    value === "status" ||
    value === "assistance" ||
    value === "system"
    ? value
    : "chat";
}

async function validateMissionControlContext(organizationId: string, eventId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 }) };
  }

  if (!(await isActiveParadeRequest(eventId))) {
    return {
      error: NextResponse.json(
        { ok: false, error: "This parade is no longer active in Mission Control. Refresh and select it again." },
        { status: 409 }
      ),
    };
  }

  return { supabase, user };
}

function toApiMessage(
  message: Awaited<ReturnType<typeof listMissionControlMessages>>[number],
  smsStatus?: MessageSmsStatus
) {
  return {
    id: message.id,
    senderName: message.sender_name || "COC",
    senderType: message.sender_type === "float" ? "parade_unit" : message.sender_type,
    channel: message.channel,
    unitName: message.unit_name,
    entryNumber: message.entry_number,
    messageBody: message.message_body,
    createdAt: message.created_at,
    direction: message.direction,
    source: message.source,
    smsStatus: smsStatus?.status ?? null,
    smsRecipientCount: smsStatus?.recipientCount ?? 0,
    smsDeliveredCount: smsStatus?.deliveredCount ?? 0,
    smsFailedCount: smsStatus?.failedCount ?? 0,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() || "";
  const eventId = url.searchParams.get("eventId")?.trim() || "";

  if (!organizationId || !eventId) {
    return NextResponse.json(
      { ok: false, error: "Organization and event are required." },
      { status: 400 }
    );
  }

  const context = await validateMissionControlContext(organizationId, eventId);
  if ("error" in context) return context.error;

  try {
    const messages = await listMissionControlMessages({ organizationId, eventId });
    const smsStatuses = await listMessageSmsStatuses(messages.map((message) => message.id));

    return NextResponse.json({
      ok: true,
      messages: messages.map((message) => toApiMessage(message, smsStatuses.get(message.id))),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load messages." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SendMissionControlRequest | null;
  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const paradeUnitId = String(payload?.paradeUnitId || "").trim() || null;
  const senderName = String(payload?.senderName || "").trim();
  const messageBody = String(payload?.messageBody || "").trim();
  const channel = parseChannel(payload?.channel);

  if (!organizationId || !eventId || !messageBody) {
    return NextResponse.json(
      { ok: false, error: "Organization, event, and message body are required." },
      { status: 400 }
    );
  }

  const context = await validateMissionControlContext(organizationId, eventId);
  if ("error" in context) return context.error;

  let entry:
    | { id: string; name: string; parade_number: number | null }
    | null = null;

  if (paradeUnitId) {
    const { data, error } = await context.supabase
      .from("entries")
      .select("id, name, parade_number")
      .eq("id", paradeUnitId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Parade unit not found." }, { status: 404 });
    }

    entry = data;
  }

  try {
    const message = await sendMissionControlMessage({
      organizationId,
      eventId,
      paradeUnitId: entry?.id ?? null,
      senderUserId: context.user.id,
      senderType: parseSenderType(payload?.senderType),
      channel,
      senderName,
      senderRole: "COC",
      unitName: entry?.name ?? null,
      entryNumber: entry?.parade_number ?? null,
      messageBody,
      messageType: parseMessageType(payload?.messageType),
      source: "app",
      direction: "outbound",
    });

    let sms: SmsDeliverySummary;
    try {
      sms = await sendMissionControlSms({
        organizationId,
        eventId,
        missionControlMessageId: message.id,
        messageBody,
        channel,
        paradeUnitId: entry?.id ?? null,
      });
    } catch (error) {
      sms = {
        status: "failed",
        attempted: 0,
        queued: 0,
        failed: 0,
        message: error instanceof Error ? error.message : "SMS delivery failed.",
      };
    }

    return NextResponse.json({
      ok: true,
      message: toApiMessage(message),
      sms,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to send message." },
      { status: 500 }
    );
  }
}
