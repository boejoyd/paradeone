import "server-only";

import twilio from "twilio";

type TwilioConfiguration = {
  accountSid: string;
  authToken: string;
  fromPhone: string | null;
  messagingServiceSid: string | null;
  webhookBaseUrl: string;
};

export type TwilioWebhookParameters = Record<string, string>;

function readTwilioConfiguration(): TwilioConfiguration {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim() || null;
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;
  const webhookBaseUrl = (
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() || ""
  ).replace(/\/+$/, "");

  if (!accountSid || !authToken || (!fromPhone && !messagingServiceSid)) {
    throw new Error("SMS provider is not configured.");
  }

  if (!webhookBaseUrl) {
    throw new Error("TWILIO_WEBHOOK_BASE_URL is not configured.");
  }

  return {
    accountSid,
    authToken,
    fromPhone,
    messagingServiceSid,
    webhookBaseUrl,
  };
}

function readWebhookAuthConfiguration() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const webhookBaseUrl = (
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() || ""
  ).replace(/\/+$/, "");

  if (!accountSid || !authToken || !webhookBaseUrl) {
    throw new Error("Twilio webhook validation is not configured.");
  }

  return { accountSid, authToken, webhookBaseUrl };
}

export function getTwilioWebhookUrl(request: Request): string {
  const { webhookBaseUrl } = readWebhookAuthConfiguration();
  const incomingUrl = new URL(request.url);
  return `${webhookBaseUrl}${incomingUrl.pathname}${incomingUrl.search}`;
}

export function validateTwilioWebhook(
  request: Request,
  parameters: TwilioWebhookParameters
): boolean {
  const { authToken } = readWebhookAuthConfiguration();
  const signature = request.headers.get("x-twilio-signature") || "";

  if (!signature) {
    return false;
  }

  return twilio.validateRequest(
    authToken,
    signature,
    getTwilioWebhookUrl(request),
    parameters
  );
}

export function twimlResponse(status = 200, message?: string): Response {
  const response = new twilio.twiml.MessagingResponse();
  if (message) {
    response.message(message);
  }

  return new Response(response.toString(), {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function getTwilioStatusCallbackUrl(): string {
  const { webhookBaseUrl } = readTwilioConfiguration();
  return `${webhookBaseUrl}/api/sms/status`;
}

export async function sendTwilioSms(input: { to: string; body: string }) {
  const configuration = readTwilioConfiguration();
  const client = twilio(configuration.accountSid, configuration.authToken);

  const message = await client.messages.create({
    to: input.to,
    body: input.body,
    statusCallback: getTwilioStatusCallbackUrl(),
    ...(configuration.messagingServiceSid
      ? { messagingServiceSid: configuration.messagingServiceSid }
      : { from: configuration.fromPhone! }),
  });

  return {
    sid: message.sid,
    status: message.status,
  };
}

export function assertTwilioAccount(parameters: TwilioWebhookParameters): boolean {
  const { accountSid } = readWebhookAuthConfiguration();
  return parameters.AccountSid === accountSid;
}
