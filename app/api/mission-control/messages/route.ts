import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  sendMissionControlMessage,
  type MissionControlChannel,
  type MissionControlMessageType,
} from "@/lib/mission-control/communications";
import {
  sendMissionControlSms,
  type SmsSendSummary,
} from "@/lib/mission-control/sms";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SendMissionControlRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  channel?: unknown;
  messageType?: unknown;
  senderName?: unknown;
  messageBody?: unknown;
  sendSms?: unknown;
  paradeUnitId?: unknown;
};

function parseChannel(value: unknown): MissionControlChannel {
  return value === "broadcast" ||
    value === "parade_units" ||
    value === "volunteers" ||
    value === "section_captains"
    ? value
    : "broadcast";
}

function parseMessageType(value: unknown): MissionControlMessageType {
  return value === "chat" ||
    value === "status" ||
    value === "assistance" ||
    value === "system"
    ? value
    : "chat";
}

function toUiMessage(message: {
  id: string;
  sender_name: string | null;
  sender_type: string;
  channel: string;
  unit_name: string | null;
  entry_number: number | null;
  message_body: string;
  created_at: string;
}) {
  return {
    id: message.id,
    senderName: message.sender_name || "COC",
    senderType:
      message.sender_type === "float" ? "parade_unit" : message.sender_type,
    channel: message.channel,
    unitName: message.unit_name,
    entryNumber: message.entry_number,
    messageBody: message.message_body,
    createdAt: message.created_at,
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

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("mission_control_messages")
    .select(
      "id, sender_name, sender_type, channel, unit_name, entry_number, message_body, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (messagesError) {
    return NextResponse.json(
      { ok: false, error: "Unable to load messages." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, messages: (messages ?? []).map(toUiMessage) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SendMissionControlRequest | null;

  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const senderName = String(payload?.senderName || "").trim();
  const messageBody = String(payload?.messageBody || "").trim();
  const requestedParadeUnitId = String(payload?.paradeUnitId || "").trim();

  if (!organizationId || !messageBody) {
    return NextResponse.json(
      { ok: false, error: "Organization and message body are required." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let targetUnit: { id: string; name: string; parade_number: number | null } | null = null;

  if (eventId) {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { ok: false, error: "Event not found." },
        { status: 404 }
      );
    }

    if (requestedParadeUnitId) {
      const { data: entry, error: entryError } = await supabase
        .from("entries")
        .select("id, name, parade_number")
        .eq("id", requestedParadeUnitId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (entryError || !entry) {
        return NextResponse.json(
          { ok: false, error: "Parade unit not found in the active parade." },
          { status: 404 }
        );
      }

      targetUnit = entry;
    }
  } else if (requestedParadeUnitId) {
    return NextResponse.json(
      { ok: false, error: "An active parade is required for a direct unit message." },
      { status: 400 }
    );
  }

  try {
    const channel = targetUnit ? "parade_units" : parseChannel(payload?.channel);
    const message = await sendMissionControlMessage({
      organizationId,
      eventId: eventId || null,
      senderUserId: user.id,
      senderType: "coc",
      channel,
      senderName: senderName || "COC",
      senderRole: "COC",
      messageBody,
      messageType: parseMessageType(payload?.messageType),
      source: "app",
      direction: "outbound",
      paradeUnitId: targetUnit?.id ?? null,
      unitName: targetUnit?.name ?? null,
      entryNumber: targetUnit?.parade_number ?? null,
    });

    let sms: SmsSendSummary | null = null;
    let warning: string | null = null;

    if (payload?.sendSms === true) {
      if (!eventId) {
        warning = "Message saved, but SMS requires an active parade.";
      } else {
        try {
          sms = await sendMissionControlSms({
            organizationId,
            eventId,
            channel,
            missionControlMessageId: message.id,
            body: messageBody,
            paradeUnitId: targetUnit?.id ?? null,
          });

          if (sms.attempted === 0) {
            warning =
              "Message saved, but there were no opted-in SMS recipients in this channel.";
          } else if (sms.failed > 0) {
            warning = `Message saved. ${sms.sent} text${sms.sent === 1 ? "" : "s"} sent and ${sms.failed} failed.`;
          }
        } catch {
          warning = "Message saved, but SMS delivery failed.";
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: toUiMessage(message),
      sms,
      warning,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to send message." },
      { status: 500 }
    );
  }
}
