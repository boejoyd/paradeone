import { randomBytes } from "node:crypto";

import { supabase } from "@/lib/supabase";

export type ParticipantTokenPayload = {
  organizationId: string;
  eventId: string;
  entryId: string;
  token: string;
  expiresAt: string | null;
};

type ParticipantTokenRow = {
  token: string;
  organization_id: string;
  event_id: string;
  entry_id: string;
  expires_at: string | null;
  revoked_at: string | null;
};

function mapRowToPayload(row: ParticipantTokenRow): ParticipantTokenPayload {
  return {
    token: row.token,
    organizationId: row.organization_id,
    eventId: row.event_id,
    entryId: row.entry_id,
    expiresAt: row.expires_at,
  };
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

function generateParticipantToken() {
  return randomBytes(24).toString("base64url");
}

export async function getParticipantTokenPayload(
  token: string
): Promise<ParticipantTokenPayload | null> {
  if (!token) {
    return null;
  }

  const { data, error } = await supabase
    .from("participant_access_tokens")
    .select("token, organization_id, event_id, entry_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ParticipantTokenRow;

  if (row.revoked_at || isExpired(row.expires_at)) {
    return null;
  }

  return mapRowToPayload(row);
}

export async function createOrReuseParticipantToken(params: {
  organizationId: string;
  eventId: string;
  entryId: string;
  expiresAt?: string | null;
}): Promise<ParticipantTokenPayload> {
  const { organizationId, eventId, entryId, expiresAt = null } = params;

  const { data: existing, error: existingError } = await supabase
    .from("participant_access_tokens")
    .select("token, organization_id, event_id, entry_id, expires_at, revoked_at")
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .eq("entry_id", entryId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingRow = existing as ParticipantTokenRow | null;

  if (existingRow && !isExpired(existingRow.expires_at)) {
    return mapRowToPayload(existingRow);
  }

  const token = generateParticipantToken();
  const { data: inserted, error: insertError } = await supabase
    .from("participant_access_tokens")
    .insert({
      token,
      organization_id: organizationId,
      event_id: eventId,
      entry_id: entryId,
      expires_at: expiresAt,
    })
    .select("token, organization_id, event_id, entry_id, expires_at, revoked_at")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Unable to create participant token.");
  }

  return mapRowToPayload(inserted as ParticipantTokenRow);
}