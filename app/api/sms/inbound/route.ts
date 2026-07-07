import { NextResponse } from "next/server";

import { sendMissionControlMessage } from "@/lib/mission-control/communications";
import {
  lookupCommunicationsIdentityByPhone,
  normalizePhoneNumber,
  recordInboundSmsForParticipant,
} from "@/lib/mission-control/communicationsDirectory";

export async function POST(request: Request) {
  let from = "";
  let body = "";

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as {
      From?: unknown;
      Body?: unknown;
    };

    from = String(payload.From || "").trim();
    body = String(payload.Body || "").trim();
  } else {
    const formData = await request.formData().catch(() => null);
    from = String(formData?.get("From") || "").trim();
    body = String(formData?.get("Body") || "").trim();
  }

  if (!from || !body) {
    return NextResponse.json(
      { ok: false, error: "From and Body are required." },
      { status: 400 }
    );
  }

  const normalizedPhone = normalizePhoneNumber(from);
  const identity = await lookupCommunicationsIdentityByPhone(normalizedPhone);

  if (!identity) {
    return NextResponse.json(
      { ok: false, error: "Sender phone number is not recognized in communications directory." },
      { status: 422 }
    );
  }

  const organizationId = identity.organizationId;
  const eventId = identity.eventId;

  const channel =
    identity?.senderType === "parade_unit"
      ? "parade_units"
      : identity?.senderType === "volunteer"
        ? "volunteers"
        : identity?.senderType === "section_captain"
          ? "section_captains"
          : "broadcast";

  const senderType = identity.senderType;
  const senderName = identity.senderName;
  const unitName = identity.unitName;
  const entryNumber = identity.entryNumber;

  await sendMissionControlMessage({
    organizationId,
    eventId,
    channel,
    senderType,
    senderName,
    senderPhone: normalizedPhone,
    paradeUnitId: identity.paradeUnitId,
    volunteerId: identity.volunteerId,
    unitName,
    entryNumber,
    messageBody: body,
    messageType: "chat",
    direction: "inbound",
    source: "sms",
  });

  if (identity.participantId) {
    await recordInboundSmsForParticipant(identity.participantId, normalizedPhone);
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    identity: identity.displayLabel,
  });
}
