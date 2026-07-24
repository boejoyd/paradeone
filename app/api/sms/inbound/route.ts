import {
  sendMissionControlMessage,
  type MissionControlChannel,
} from "@/lib/mission-control/communications";
import {
  lookupCommunicationsIdentityByPhone,
  normalizePhoneNumber,
  recordInboundSmsForParticipant,
  setParticipantSmsConsent,
} from "@/lib/mission-control/communicationsDirectory";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  assertTwilioAccount,
  twimlResponse,
  validateTwilioWebhook,
  type TwilioWebhookParameters,
} from "@/lib/twilio";

type OptOutAction = "START" | "STOP" | "HELP" | null;

function formDataToParameters(formData: FormData): TwilioWebhookParameters {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)])
  );
}

function parseOptOutAction(parameters: TwilioWebhookParameters): OptOutAction {
  const providerAction = parameters.OptOutType?.trim().toUpperCase();

  if (
    providerAction === "START" ||
    providerAction === "STOP" ||
    providerAction === "HELP"
  ) {
    return providerAction;
  }

  const body = parameters.Body?.trim().toLowerCase() || "";

  if (/^(stop|stopall|unsubscribe|cancel|end|quit)$/.test(body)) return "STOP";
  if (/^(start|unstop|yes)$/.test(body)) return "START";
  if (/^(help|info)$/.test(body)) return "HELP";

  return null;
}

function channelForSender(
  senderType: "parade_unit" | "volunteer" | "section_captain"
): MissionControlChannel {
  if (senderType === "parade_unit") return "parade_units";
  if (senderType === "volunteer") return "volunteers";
  return "section_captains";
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return twimlResponse(400);
  }

  const parameters = formDataToParameters(formData);

  try {
    if (
      !validateTwilioWebhook(request, parameters) ||
      !assertTwilioAccount(parameters)
    ) {
      return twimlResponse(403);
    }
  } catch (error) {
    console.error("Twilio webhook validation is unavailable.", error);
    return twimlResponse(503);
  }

  const from = parameters.From?.trim() || "";
  const body = parameters.Body?.trim() || "";
  const providerMessageSid =
    parameters.MessageSid?.trim() || parameters.SmsSid?.trim() || "";

  if (!from || !body || !providerMessageSid) {
    return twimlResponse(400);
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    console.error("Inbound SMS database access is not configured.");
    return twimlResponse(503);
  }

  const { data: existingMessage } = await supabase
    .from("mission_control_messages")
    .select("id")
    .eq("provider_message_sid", providerMessageSid)
    .maybeSingle();

  if (existingMessage) {
    return twimlResponse();
  }

  const normalizedPhone = normalizePhoneNumber(from);
  const identity = await lookupCommunicationsIdentityByPhone(
    normalizedPhone,
    supabase
  );

  if (!identity) {
    console.warn("Inbound SMS sender was not found in the communications directory.", {
      providerMessageSid,
    });
    return twimlResponse();
  }

  const optOutAction = parseOptOutAction(parameters);

  if (identity.participantId && optOutAction === "STOP") {
    await setParticipantSmsConsent(
      identity.participantId,
      "opted_out",
      supabase
    );
  } else if (identity.participantId && optOutAction === "START") {
    await setParticipantSmsConsent(identity.participantId, "opted_in", supabase);
  }

  if (identity.paradeUnitId && (optOutAction === "STOP" || optOutAction === "START")) {
    const optedIn = optOutAction === "START";
    const { error: entryConsentError } = await supabase
      .from("entries")
      .update({
        sms_opt_in: optedIn,
        sms_opt_in_at: optedIn ? new Date().toISOString() : null,
        sms_opt_in_source: `twilio_${optOutAction.toLowerCase()}`,
      })
      .eq("id", identity.paradeUnitId);

    if (entryConsentError) {
      console.error("Entry SMS consent could not be updated.", {
        entryId: identity.paradeUnitId,
        error: entryConsentError.message,
      });
    }
  }

  try {
    await sendMissionControlMessage(
      {
        organizationId: identity.organizationId,
        eventId: identity.eventId,
        channel: channelForSender(identity.senderType),
        senderType: identity.senderType,
        senderName: identity.senderName,
        senderPhone: normalizedPhone,
        paradeUnitId: identity.paradeUnitId,
        volunteerId: identity.volunteerId,
        unitName: identity.unitName,
        entryNumber: identity.entryNumber,
        messageBody: body,
        messageType: optOutAction ? "system" : "chat",
        direction: "inbound",
        source: "sms",
        providerMessageSid,
      },
      supabase
    );

    if (identity.participantId) {
      await recordInboundSmsForParticipant(
        identity.participantId,
        normalizedPhone,
        supabase
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isDuplicate = message.includes("duplicate") || message.includes("unique");

    if (!isDuplicate) {
      console.error("Inbound SMS could not be recorded.", {
        providerMessageSid,
        error: message,
      });
      return twimlResponse(500);
    }
  }

  if (optOutAction === "HELP" && !parameters.OptOutType) {
    return twimlResponse(
      200,
      "ParadeOne operational alerts. Reply STOP to opt out or contact your parade organizer for help."
    );
  }

  return twimlResponse();
}
