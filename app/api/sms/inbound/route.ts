import { sendMissionControlMessage } from "@/lib/mission-control/communications";
import {
  lookupCommunicationsIdentityByPhone,
  normalizePhoneNumber,
  recordInboundSmsForParticipant,
  updateSmsConsentForIdentity,
} from "@/lib/mission-control/communicationsDirectory";
import {
  twimlResponse,
  validateTwilioFormRequest,
} from "@/lib/twilio";

const STOP_PATTERN = /^(stop|stopall|unsubscribe|cancel|end|quit)\b/i;
const START_PATTERN = /^(start|unstop|yes)\b/i;
const HELP_PATTERN = /^help\b/i;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return new Response("Twilio form payload required.", { status: 415 });
  }

  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const validation = validateTwilioFormRequest(request, params);

  if (validation === "not_configured") {
    return new Response("Twilio webhook validation is not configured.", { status: 503 });
  }

  if (validation !== "valid") {
    return new Response("Invalid Twilio signature.", { status: 403 });
  }

  const from = String(params.get("From") || "").trim();
  const body = String(params.get("Body") || "").trim();
  const optOutType = String(params.get("OptOutType") || "").trim().toUpperCase();

  if (!from || !body) {
    return twimlResponse();
  }

  const normalizedPhone = normalizePhoneNumber(from);
  const isStart = optOutType === "START" || START_PATTERN.test(body);
  const identity = await lookupCommunicationsIdentityByPhone(normalizedPhone, {
    includeInactive: isStart,
  });

  if (!identity) {
    return twimlResponse(
      "ParadeOne could not match this number to an active parade. Contact your event organizer for assistance."
    );
  }

  const isStop = optOutType === "STOP" || STOP_PATTERN.test(body);
  const isHelp = optOutType === "HELP" || HELP_PATTERN.test(body);
  const channel =
    identity.senderType === "parade_unit"
      ? "parade_units"
      : identity.senderType === "volunteer"
        ? "volunteers"
        : "section_captains";

  await sendMissionControlMessage({
    organizationId: identity.organizationId,
    eventId: identity.eventId,
    channel,
    senderType: identity.senderType,
    senderName: identity.senderName,
    senderPhone: normalizedPhone,
    paradeUnitId: identity.paradeUnitId,
    volunteerId: identity.volunteerId,
    unitName: identity.unitName,
    entryNumber: identity.entryNumber,
    messageBody: body,
    messageType: isStop || isStart || isHelp ? "system" : "chat",
    direction: "inbound",
    source: "sms",
  });

  if (identity.participantId) {
    await recordInboundSmsForParticipant(identity.participantId, normalizedPhone);
  }

  if (isStop) {
    await updateSmsConsentForIdentity(identity, false);
    return twimlResponse(
      "You are unsubscribed from ParadeOne operational SMS messages. Reply START to receive messages again."
    );
  }

  if (isStart) {
    await updateSmsConsentForIdentity(identity, true);
    return twimlResponse(
      "ParadeOne operational SMS messages are active. Reply STOP to unsubscribe or HELP for assistance."
    );
  }

  if (isHelp) {
    return twimlResponse(
      "ParadeOne provides operational parade updates. Contact your event organizer for support. Reply STOP to unsubscribe."
    );
  }

  return twimlResponse();
}
