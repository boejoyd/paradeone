import { validateRequest } from "twilio";

type TwilioConfiguration = {
  accountSid: string;
  authToken: string;
  fromPhone: string | null;
  messagingServiceSid: string | null;
};

export type TwilioSendResult = {
  sid: string;
  status: string;
};

function getTwilioConfiguration(): TwilioConfiguration | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim() || null;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;

  if (!accountSid || !authToken || (!fromPhone && !messagingServiceSid)) {
    return null;
  }

  return { accountSid, authToken, fromPhone, messagingServiceSid };
}

export function isTwilioConfigured(): boolean {
  return getTwilioConfiguration() !== null;
}

export function getPublicWebhookUrl(pathname: string): string | null {
  const configuredBaseUrl =
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;

  if (!configuredBaseUrl) {
    return null;
  }

  return `${configuredBaseUrl.replace(/\/$/, "")}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function getTwilioRequestValidationUrl(request: Request): string {
  const requestUrl = new URL(request.url);
  const configuredBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return request.url;
  }

  return `${configuredBaseUrl.replace(/\/$/, "")}${requestUrl.pathname}${requestUrl.search}`;
}

export function validateTwilioFormRequest(
  request: Request,
  params: URLSearchParams
): "valid" | "invalid" | "not_configured" {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature")?.trim();

  if (!authToken) {
    return "not_configured";
  }

  if (!signature) {
    return "invalid";
  }

  const formValues: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    formValues[key] = values.length === 1 ? values[0] : values;
  }

  return validateRequest(
    authToken,
    signature,
    getTwilioRequestValidationUrl(request),
    formValues
  )
    ? "valid"
    : "invalid";
}

export async function sendTwilioSms(input: {
  to: string;
  body: string;
  statusCallbackUrl?: string | null;
}): Promise<TwilioSendResult> {
  const configuration = getTwilioConfiguration();

  if (!configuration) {
    throw new Error("Twilio SMS is not configured.");
  }

  const body = new URLSearchParams({
    To: input.to,
    Body: input.body,
  });

  if (configuration.messagingServiceSid) {
    body.set("MessagingServiceSid", configuration.messagingServiceSid);
  } else if (configuration.fromPhone) {
    body.set("From", configuration.fromPhone);
  }

  if (input.statusCallbackUrl) {
    body.set("StatusCallback", input.statusCallbackUrl);
  }

  const authorization = Buffer.from(
    `${configuration.accountSid}:${configuration.authToken}`
  ).toString("base64");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${configuration.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | { sid?: string; status?: string; message?: string }
    | null;

  if (!response.ok || !payload?.sid) {
    throw new Error(payload?.message || "Twilio SMS sending failed.");
  }

  return {
    sid: payload.sid,
    status: payload.status || "queued",
  };
}

export function twimlResponse(message?: string): Response {
  const escapedMessage = message
    ?.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  const xml = escapedMessage
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedMessage}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
