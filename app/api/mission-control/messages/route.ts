import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  sendMissionControlMessage,
  type MissionControlChannel,
  type MissionControlMessageType,
  type MissionControlSenderType,
} from "@/lib/mission-control/communications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SendMissionControlRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  channel?: unknown;
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

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SendMissionControlRequest | null;

  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const senderName = String(payload?.senderName || "").trim();
  const messageBody = String(payload?.messageBody || "").trim();

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

  try {
    const message = await sendMissionControlMessage({
      organizationId,
      eventId: eventId || null,
      senderUserId: user.id,
      senderType: parseSenderType(payload?.senderType),
      channel: parseChannel(payload?.channel),
      senderName,
      senderRole: "COC",
      messageBody,
      messageType: parseMessageType(payload?.messageType),
      source: "app",
      direction: "outbound",
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        senderName: message.sender_name || "COC",
        senderType:
          message.sender_type === "float" ? "parade_unit" : message.sender_type,
        channel: message.channel,
        unitName: message.unit_name,
        entryNumber: message.entry_number,
        messageBody: message.message_body,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to send message." },
      { status: 500 }
    );
  }
}
