import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  twimlResponse,
  validateTwilioFormRequest,
} from "@/lib/twilio";

const DELIVERED_STATUSES = new Set(["delivered", "read"]);
const FAILED_STATUSES = new Set(["failed", "undelivered"]);

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

  const requestUrl = new URL(request.url);
  const deliveryId = requestUrl.searchParams.get("deliveryId")?.trim() || "";
  const messageSid = String(params.get("MessageSid") || "").trim();
  const providerStatus = String(params.get("MessageStatus") || "").trim().toLowerCase();
  const errorCode = String(params.get("ErrorCode") || "").trim() || null;
  const errorMessage = String(params.get("ErrorMessage") || "").trim() || null;

  if ((!deliveryId && !messageSid) || !providerStatus) {
    return twimlResponse();
  }

  const now = new Date().toISOString();
  const supabase = await createServerSupabaseClient();
  const update = {
    provider_message_sid: messageSid || undefined,
    provider_status: providerStatus,
    error_code: errorCode,
    error_message: errorMessage,
    delivered_at: DELIVERED_STATUSES.has(providerStatus) ? now : undefined,
    failed_at: FAILED_STATUSES.has(providerStatus) ? now : undefined,
    updated_at: now,
  };

  const query = supabase.from("sms_deliveries").update(update);
  const { error } = deliveryId
    ? await query.eq("id", deliveryId)
    : await query.eq("provider_message_sid", messageSid);

  if (error) {
    return new Response("Unable to record SMS delivery status.", { status: 500 });
  }

  return twimlResponse();
}
