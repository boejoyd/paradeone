import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const intuitAuthBase = "https://appcenter.intuit.com/connect/oauth2";
const intuitTokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const qboApiBase = "https://quickbooks.api.intuit.com/v3/company";

type StoredConnection = {
  realm_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string | null;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function encryptionKey() {
  return createHash("sha256").update(required("QUICKBOOKS_TOKEN_ENCRYPTION_KEY")).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function basicAuthorization() {
  return `Basic ${Buffer.from(`${required("QUICKBOOKS_CLIENT_ID")}:${required("QUICKBOOKS_CLIENT_SECRET")}`).toString("base64")}`;
}

async function exchangeToken(parameters: URLSearchParams) {
  const response = await fetch(intuitTokenUrl, {
    method: "POST",
    headers: { Authorization: basicAuthorization(), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: parameters,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`QuickBooks authorization failed (${response.status}).`);
  return response.json() as Promise<TokenResponse>;
}

export function quickBooksAuthorizationUrl(state: string) {
  const url = new URL(intuitAuthBase);
  url.searchParams.set("client_id", required("QUICKBOOKS_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  url.searchParams.set("redirect_uri", required("QUICKBOOKS_REDIRECT_URI"));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function saveQuickBooksAuthorization(code: string, realmId: string) {
  const tokens = await exchangeToken(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: required("QUICKBOOKS_REDIRECT_URI"),
  }));
  await saveConnection(realmId, tokens);
}

async function saveConnection(realmId: string, tokens: TokenResponse) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("The database service is not configured.");
  const now = Date.now();
  const { error } = await supabase.from("quickbooks_connections").upsert({
    realm_id: realmId,
    encrypted_access_token: encrypt(tokens.access_token),
    encrypted_refresh_token: encrypt(tokens.refresh_token),
    access_token_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
    refresh_token_expires_at: tokens.x_refresh_token_expires_in ? new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString() : null,
    updated_at: new Date(now).toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function connection(realmId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("The database service is not configured.");
  const { data, error } = await supabase.from("quickbooks_connections").select("*").eq("realm_id", realmId).single();
  if (error || !data) throw new Error("This QuickBooks company is not connected.");
  const stored = data as StoredConnection;
  if (new Date(stored.access_token_expires_at).getTime() > Date.now() + 60_000) return decrypt(stored.encrypted_access_token);
  const tokens = await exchangeToken(new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(stored.encrypted_refresh_token) }));
  await saveConnection(realmId, tokens);
  return tokens.access_token;
}

export function verifyQuickBooksWebhook(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha256", required("QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN")).update(rawBody).digest("base64");
  const supplied = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated);
}

export async function fetchQuickBooksEntity(realmId: string, entityName: string, entityId: string) {
  const allowed = new Set(["SalesReceipt", "RefundReceipt", "Customer"]);
  if (!allowed.has(entityName)) throw new Error("Unsupported QuickBooks entity.");
  const accessToken = await connection(realmId);
  const response = await fetch(`${qboApiBase}/${encodeURIComponent(realmId)}/${entityName.toLowerCase()}/${encodeURIComponent(entityId)}?minorversion=75`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`QuickBooks API returned ${response.status}.`);
  const payload = await response.json() as Record<string, unknown>;
  return payload[entityName] as Record<string, unknown> | undefined;
}

export function quickBooksDayPassItemIds() {
  return new Set((process.env.QUICKBOOKS_DAY_PASS_ITEM_IDS || "").split(",").map((value) => value.trim()).filter(Boolean));
}
