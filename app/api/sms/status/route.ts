import { getSmsStatusRank } from "@/lib/mission-control/sms";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  assertTwilioAccount,
  validateTwilioWebhook,
  type TwilioWebhookParameters,
} from "@/lib/twilio";

function formDataToParameters(formData: FormData): TwilioWebhookParameters {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)])
  );
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return new Response(null, { status: 400 });
  }

  const parameters = formDataToParameters(formData);

  try {
    if (
      !validateTwilioWebhook(request, parameters) ||
      !assertTwilioAccount(parameters)
    ) {
      return new Response(null, { status: 403 });
    }
  } catch (error) {
    console.error("Twilio status validation is unavailable.", error);
    return new Response(null, { status: 503 });
  }

  const providerMessageSid =
    parameters.MessageSid?.trim() || parameters.SmsSid?.trim() || "";
  const providerStatus = parameters.MessageStatus?.trim().toLowerCase() || "";

  if (!providerMessageSid || !providerStatus) {
    return new Response(null, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    console.error("SMS delivery database access is not configured.");
    return new Response(null, { status: 503 });
  }

  const { data: delivery, error: lookupError } = await supabase
    .from("sms_deliveries")
    .select("id, provider_status, status_rank")
    .eq("provider_message_sid", providerMessageSid)
    .maybeSingle();

  if (lookupError) {
    console.error("SMS delivery status lookup failed.", {
      providerMessageSid,
      error: lookupError.message,
    });
    return new Response(null, { status: 500 });
  }

  if (!delivery) {
    // A callback can race the delivery insert immediately after Twilio accepts
    // the send. Ask Twilio to retry rather than silently losing the status.
    return new Response(null, { status: 503 });
  }

  const incomingRank = getSmsStatusRank(providerStatus);
  const currentRank = Number(delivery.status_rank || 0);

  if (
    incomingRank < currentRank ||
    (incomingRank === currentRank && delivery.provider_status !== providerStatus)
  ) {
    return new Response(null, { status: 204 });
  }

  const { error: updateError } = await supabase
    .from("sms_deliveries")
    .update({
      provider_status: providerStatus,
      status_rank: incomingRank,
      error_code: parameters.ErrorCode?.trim() || null,
      error_message: parameters.ErrorMessage?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", delivery.id);

  if (updateError) {
    console.error("SMS delivery status update failed.", {
      providerMessageSid,
      error: updateError.message,
    });
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
