import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { maskEmail, maskPhone, normalizeCampPhone } from "@/lib/campNackteWaiver";
import { supabase } from "@/lib/supabase";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type HistoricalWaiver = {
  id: string;
  guest_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linked_day_pass_purchase_id: string | null;
  signed_at: string;
  status: string;
};

type LookupRow = { id: string; legal_name: string; created_at: string };
type LookupError = { code?: string; message: string; details?: string | null; hint?: string | null };
type IdentityResolution = { guestId: string | null; purchaseId: string | null; ambiguous: boolean; candidateGuestIds: string[] };
type MemoryAmbiguitySession = { candidateGuestIds: string[]; expiresAt: number };

const memorySessionsKey = "__campNackteAmbiguitySessions";

function memoryAmbiguitySessions() {
  const globalStore = globalThis as typeof globalThis & { [memorySessionsKey]?: Map<string, MemoryAmbiguitySession> };
  globalStore[memorySessionsKey] ??= new Map<string, MemoryAmbiguitySession>();
  return globalStore[memorySessionsKey];
}

function logLookupDatabaseError(branch: string, table: string, error: LookupError) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[CAMP_WAIVER_LOOKUP]", {
      branch,
      table,
      code: error.code || "unknown",
      message: error.message,
      details: error.details || null,
      hint: error.hint || null,
    });
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function phoneStorageVariants(phone: string) {
  const area = phone.slice(0, 3);
  const prefix = phone.slice(3, 6);
  const line = phone.slice(6);
  return [...new Set([
    phone,
    `1${phone}`,
    `+1${phone}`,
    `${area}-${prefix}-${line}`,
    `${area}.${prefix}.${line}`,
    `${area} ${prefix} ${line}`,
    `(${area}) ${prefix}-${line}`,
    `(${area})${prefix}-${line}`,
    `+1 ${area}-${prefix}-${line}`,
    `+1 (${area}) ${prefix}-${line}`,
    `1-${area}-${prefix}-${line}`,
  ])];
}

function logLookupDecision(rawWaiverRowCount: number, distinctGuestCandidateCount: number, branch: "no_match" | "resolved" | "ambiguous") {
  if (process.env.NODE_ENV !== "production") {
    console.info("[CAMP_WAIVER_LOOKUP]", { rawWaiverRowCount, distinctGuestCandidateCount, branch });
  }
}

function normalizedLegalName(value: string | null) {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") || "";
}

async function findGuestsByContact(lookupType: "email" | "phone", normalizedValue: string) {
  const normalizedColumn = lookupType === "email" ? "normalized_email" : "normalized_phone";
  const normalizedQuery = await supabase.from("camp_guests").select("id, legal_name, created_at").eq(normalizedColumn, normalizedValue).limit(10);
  if (!normalizedQuery.error) return { data: (normalizedQuery.data || []) as LookupRow[], error: null };
  logLookupDatabaseError(`${lookupType}_normalized`, "camp_guests", normalizedQuery.error);
  if (normalizedQuery.error.code !== "42703") return { data: [] as LookupRow[], error: normalizedQuery.error };

  const fallbackQuery = lookupType === "email"
    ? await supabase.from("camp_guests").select("id, legal_name, created_at").ilike("email", escapeLikePattern(normalizedValue)).limit(10)
    : await supabase.from("camp_guests").select("id, legal_name, created_at").in("phone", phoneStorageVariants(normalizedValue)).limit(10);
  if (fallbackQuery.error) logLookupDatabaseError(`${lookupType}_fallback`, "camp_guests", fallbackQuery.error);
  return { data: (fallbackQuery.data || []) as LookupRow[], error: fallbackQuery.error };
}

async function findHistoricalWaiversByContact(lookupType: "email" | "phone", normalizedValue: string) {
  const normalizedColumn = lookupType === "email" ? "normalized_email" : "normalized_phone";
  const columns = "id, guest_id, full_name, email, phone, linked_day_pass_purchase_id, signed_at, status";
  const normalizedQuery = await supabase.from("camp_nackte_waivers").select(columns).eq(normalizedColumn, normalizedValue);
  if (!normalizedQuery.error) return { data: (normalizedQuery.data || []) as HistoricalWaiver[], error: null };
  logLookupDatabaseError(`${lookupType}_normalized`, "camp_nackte_waivers", normalizedQuery.error);
  if (normalizedQuery.error.code !== "42703") return { data: [] as HistoricalWaiver[], error: normalizedQuery.error };

  const fallbackQuery = lookupType === "email"
    ? await supabase.from("camp_nackte_waivers").select(columns).ilike("email", escapeLikePattern(normalizedValue))
    : await supabase.from("camp_nackte_waivers").select(columns).in("phone", phoneStorageVariants(normalizedValue));
  if (fallbackQuery.error) logLookupDatabaseError(`${lookupType}_fallback`, "camp_nackte_waivers", fallbackQuery.error);
  return { data: (fallbackQuery.data || []) as HistoricalWaiver[], error: fallbackQuery.error };
}

async function linkWaiversToGuest(guestId: string, waivers: HistoricalWaiver[]) {
  const currentWaivers = waivers
    .filter((waiver) => waiver.status === "current")
    .sort((left, right) => new Date(right.signed_at).getTime() - new Date(left.signed_at).getTime());
  const olderCurrentIds = currentWaivers.slice(1).map((waiver) => waiver.id);
  if (olderCurrentIds.length > 0) {
    const { error: supersedeError } = await supabase.from("camp_nackte_waivers").update({ status: "superseded" }).in("id", olderCurrentIds);
    if (supersedeError) throw new Error(supersedeError.message);
  }

  const unlinkedIds = waivers.filter((waiver) => !waiver.guest_id).map((waiver) => waiver.id);
  if (unlinkedIds.length > 0) {
    const { error: linkError } = await supabase.from("camp_nackte_waivers").update({ guest_id: guestId }).in("id", unlinkedIds).is("guest_id", null);
    if (linkError) throw new Error(linkError.message);
  }
}

async function guestFromHistoricalWaivers(waivers: HistoricalWaiver[]): Promise<IdentityResolution> {
  if (waivers.length === 0) return { guestId: null, purchaseId: null, ambiguous: false, candidateGuestIds: [] };
  const guestIds = [...new Set(waivers.map((item) => item.guest_id).filter((id): id is string => Boolean(id)))];
  if (guestIds.length > 1) return { guestId: null, purchaseId: null, ambiguous: true, candidateGuestIds: guestIds };
  if (guestIds.length === 1) {
    await linkWaiversToGuest(guestIds[0], waivers);
    return { guestId: guestIds[0], purchaseId: waivers.find((item) => item.linked_day_pass_purchase_id)?.linked_day_pass_purchase_id || null, ambiguous: false, candidateGuestIds: [] };
  }

  const source = [...waivers]
    .sort((left, right) => new Date(right.signed_at).getTime() - new Date(left.signed_at).getTime())
    .find((item) => item.full_name?.trim());
  if (!source?.full_name) return { guestId: null, purchaseId: null, ambiguous: false, candidateGuestIds: [] };

  const { data: guest, error: guestError } = await supabase.from("camp_guests").insert({
    legal_name: source.full_name.trim(),
    email: source.email?.trim().toLowerCase() || null,
    phone: source.phone ? normalizeCampPhone(source.phone) : null,
  }).select("id").single();
  if (guestError || !guest) throw new Error(guestError?.message || "Unable to create the historical guest record.");

  await linkWaiversToGuest(guest.id, waivers);
  return { guestId: guest.id, purchaseId: waivers.find((item) => item.linked_day_pass_purchase_id)?.linked_day_pass_purchase_id || null, ambiguous: false, candidateGuestIds: [] };
}

async function resolveContactIdentity(guests: LookupRow[], contactWaivers: HistoricalWaiver[]): Promise<IdentityResolution> {
  const uniqueGuests = [...new Map(guests.map((guest) => [guest.id, guest])).values()];
  if (uniqueGuests.length === 0) return guestFromHistoricalWaivers(contactWaivers);
  if (uniqueGuests.length === 1) {
    const columns = "id, guest_id, full_name, email, phone, linked_day_pass_purchase_id, signed_at, status";
    const { data: linkedWaivers, error: linkedError } = await supabase.from("camp_nackte_waivers").select(columns).eq("guest_id", uniqueGuests[0].id);
    if (linkedError) throw new Error(linkedError.message);
    const allWaivers = [...new Map([...(linkedWaivers || []) as HistoricalWaiver[], ...contactWaivers].map((waiver) => [waiver.id, waiver])).values()];
    await linkWaiversToGuest(uniqueGuests[0].id, allWaivers);
    return { guestId: uniqueGuests[0].id, purchaseId: contactWaivers.find((waiver) => waiver.linked_day_pass_purchase_id)?.linked_day_pass_purchase_id || null, ambiguous: false, candidateGuestIds: [] };
  }
  return { guestId: null, purchaseId: null, ambiguous: true, candidateGuestIds: uniqueGuests.map((guest) => guest.id) };
}

async function ambiguityResponse(candidateGuestIds: string[], message = "We found more than one possible match. Please provide one more detail.") {
  const candidates = [...new Set(candidateGuestIds)];
  if (candidates.length < 2) return NextResponse.json({ found: false, message: "No matching guest was found." });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const admin = createAdminSupabaseClient();
  if (admin) {
    const { error } = await admin.from("camp_guest_ambiguity_sessions").insert({ token_hash: tokenHash, candidate_guest_ids: candidates, expires_at: expiresAt });
    if (error) return NextResponse.json({ error: "Unable to start a private refinement session." }, { status: 500 });
  } else {
    memoryAmbiguitySessions().set(tokenHash, { candidateGuestIds: candidates, expiresAt: new Date(expiresAt).getTime() });
  }
  return NextResponse.json({ found: false, ambiguous: true, ambiguityToken: token, message });
}

async function refineAmbiguousLookup(body: Record<string, unknown>) {
  const ambiguityToken = String(body.ambiguityToken || "");
  const refinementType = String(body.refinementType || "");
  const refinementValue = String(body.refinementValue || "").trim();
  if (!ambiguityToken || !refinementValue || !["email", "phone", "confirmation", "visit_date"].includes(refinementType)) {
    return NextResponse.json({ error: "Enter a valid refinement detail." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(ambiguityToken).digest("hex");
  const now = new Date().toISOString();
  const admin = createAdminSupabaseClient();
  let candidateIds: string[];
  if (admin) {
    const { data: claimed, error: claimError } = await admin.from("camp_guest_ambiguity_sessions")
      .update({ used_at: now })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("candidate_guest_ids")
      .maybeSingle();
    if (claimError) return NextResponse.json({ error: "Unable to verify the refinement session." }, { status: 500 });
    if (!claimed) return NextResponse.json({ error: "That refinement session expired or was already used. Please start a new lookup." }, { status: 401 });
    candidateIds = [...new Set((claimed.candidate_guest_ids || []) as string[])];
  } else {
    const sessions = memoryAmbiguitySessions();
    const claimed = sessions.get(tokenHash);
    sessions.delete(tokenHash);
    if (!claimed || claimed.expiresAt <= Date.now()) return NextResponse.json({ error: "That refinement session expired or was already used. Please start a new lookup." }, { status: 401 });
    candidateIds = [...new Set(claimed.candidateGuestIds)];
  }
  let matchingIds: string[] = [];

  if (refinementType === "email" || refinementType === "phone") {
    const normalizedValue = refinementType === "email" ? refinementValue.toLowerCase() : normalizeCampPhone(refinementValue);
    if (refinementType === "phone" && normalizedValue.length !== 10) return ambiguityResponse(candidateIds, "That phone number was not valid. Please try another detail.");
    const { data, error } = await findGuestsByContact(refinementType, normalizedValue);
    if (error) return NextResponse.json({ error: "The guest lookup service is temporarily unavailable." }, { status: 503 });
    matchingIds = data.map((guest) => guest.id).filter((id) => candidateIds.includes(id));
  } else if (refinementType === "confirmation") {
    const code = refinementValue.toUpperCase();
    const { data, error } = await supabase.from("camp_nackte_waivers").select("guest_id").eq("confirmation_number", code).in("guest_id", candidateIds);
    if (error) return NextResponse.json({ error: "The guest lookup service is temporarily unavailable." }, { status: 503 });
    matchingIds = (data || []).map((waiver) => waiver.guest_id).filter((id): id is string => Boolean(id));
  } else {
    const approximateDate = new Date(`${refinementValue}T00:00:00.000Z`);
    if (Number.isNaN(approximateDate.getTime())) return ambiguityResponse(candidateIds, "That visit date was not valid. Please try another detail.");
    const start = new Date(approximateDate); start.setUTCDate(start.getUTCDate() - 45);
    const end = new Date(approximateDate); end.setUTCDate(end.getUTCDate() + 45);
    const { data, error } = await supabase.from("camp_nackte_waivers").select("guest_id").in("guest_id", candidateIds).gte("visit_date", start.toISOString().slice(0, 10)).lte("visit_date", end.toISOString().slice(0, 10));
    if (error) return NextResponse.json({ error: "The guest lookup service is temporarily unavailable." }, { status: 503 });
    matchingIds = (data || []).map((waiver) => waiver.guest_id).filter((id): id is string => Boolean(id));
  }

  const narrowedCandidates = [...new Set(matchingIds)];
  if (narrowedCandidates.length === 1) return verifiedGuestResponse(narrowedCandidates[0], null);
  if (narrowedCandidates.length > 1) return ambiguityResponse(narrowedCandidates);
  return ambiguityResponse(candidateIds, "That detail did not match the possible records. Please try another detail or ask staff for assistance.");
}

async function verifiedGuestResponse(guestId: string, purchaseId: string | null, visitDate?: string) {
  const now = new Date().toISOString();
  const { error: expirationError } = await supabase.from("camp_nackte_waivers").update({ status: "expired" }).eq("guest_id", guestId).eq("status", "current").lte("expires_at", now);
  if (expirationError) return NextResponse.json({ error: expirationError.message }, { status: 500 });

  const [{ data: guest, error: guestError }, { data: waiver, error: currentWaiverError }] = await Promise.all([
    supabase.from("camp_guests").select("id, legal_name, preferred_name, email, phone").eq("id", guestId).single(),
    supabase.from("camp_nackte_waivers").select("signed_at, expires_at, confirmation_number").eq("guest_id", guestId).eq("status", "current").gt("expires_at", now).order("signed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (guestError || currentWaiverError || !guest) return NextResponse.json({ error: guestError?.message || currentWaiverError?.message || "Unable to verify the guest." }, { status: 500 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error: sessionError } = await supabase.from("camp_guest_lookup_sessions").insert({ token_hash: tokenHash, guest_id: guest.id, day_pass_purchase_id: purchaseId, expires_at: expiresAt });
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  return NextResponse.json({
    found: true,
    lookupToken: token,
    visitDate: visitDate || null,
    guest: {
      preferredName: guest.preferred_name,
      legalNameHint: `${guest.legal_name.slice(0, 1)}${"•".repeat(Math.max(2, guest.legal_name.length - 1))}`,
      maskedEmail: maskEmail(guest.email),
      maskedPhone: maskPhone(guest.phone),
    },
    currentWaiver: waiver || null,
  });
}

async function createOrFindGuest(body: Record<string, unknown>) {
  const legalName = String(body.legalName || "").trim();
  const preferredName = String(body.preferredName || "").trim() || null;
  const email = String(body.email || "").trim().toLowerCase() || null;
  const rawPhone = String(body.phone || "").trim();
  const phone = rawPhone ? normalizeCampPhone(rawPhone) : null;
  const visitDate = String(body.visitDate || "").trim();

  if (!legalName || !visitDate || (!email && !phone)) return NextResponse.json({ error: "Enter your legal name, visit date, and either an email or phone number." }, { status: 400 });
  if (rawPhone && phone?.length !== 10) return NextResponse.json({ error: "Enter a valid 10-digit US phone number." }, { status: 400 });

  const searches = await Promise.all([
    email ? findGuestsByContact("email", email) : Promise.resolve({ data: [] as LookupRow[], error: null }),
    phone ? findGuestsByContact("phone", phone) : Promise.resolve({ data: [] as LookupRow[], error: null }),
  ]);
  const searchError = searches.find((result) => result.error)?.error;
  if (searchError) return NextResponse.json({ error: "The guest lookup service is temporarily unavailable." }, { status: 503 });

  const matchingGuests = [...new Map(searches.flatMap((result) => result.data).map((guest) => [guest.id, guest])).values()];
  let guestId = matchingGuests.length === 1 ? matchingGuests[0].id : null;
  if (matchingGuests.length > 1) {
    const identityNames = new Set(matchingGuests.map((guest) => normalizedLegalName(guest.legal_name)).filter(Boolean));
    if (identityNames.size !== 1) return NextResponse.json({ error: "The contact information matches more than one guest. Please use one contact method or ask staff for assistance." }, { status: 409 });
    guestId = [...matchingGuests].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())[0].id;
  }
  if (!guestId) {
    const { data: guest, error: insertError } = await supabase.from("camp_guests").insert({ legal_name: legalName, preferred_name: preferredName, email, phone }).select("id").single();
    if (insertError || !guest) return NextResponse.json({ error: insertError?.message || "Unable to create the guest record." }, { status: 500 });
    guestId = guest.id;
  }

  if (!guestId) return NextResponse.json({ error: "Unable to resolve the guest record." }, { status: 500 });
  return verifiedGuestResponse(guestId, null, visitDate);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (body.action === "refine") return refineAmbiguousLookup(body);
  if (body.action === "create") return createOrFindGuest(body);

  const lookupType = String(body.lookupType || "");
  const rawValue = String(body.lookupValue || "").trim();
  if (!rawValue || !["email", "phone", "confirmation"].includes(lookupType)) return NextResponse.json({ error: "Enter a valid lookup value." }, { status: 400 });

  let guestId: string | null = null;
  let purchaseId: string | null = null;
  let ambiguous = false;
  let candidateGuestIds: string[] = [];
  let rawWaiverRowCount = 0;

  if (lookupType === "email" || lookupType === "phone") {
    const normalizedValue = lookupType === "email" ? rawValue.toLowerCase() : normalizeCampPhone(rawValue);
    if (lookupType === "phone" && normalizedValue.length !== 10) return NextResponse.json({ error: "Enter a valid 10-digit US phone number." }, { status: 400 });
    const [{ data: guests, error: guestsError }, { data: waivers, error: waiversError }] = await Promise.all([
      findGuestsByContact(lookupType, normalizedValue),
      findHistoricalWaiversByContact(lookupType, normalizedValue),
    ]);
    if (guestsError || waiversError) return NextResponse.json({ error: "The guest lookup service is temporarily unavailable." }, { status: 503 });
    rawWaiverRowCount = waivers.length;
    try {
      const resolved = await resolveContactIdentity(guests, waivers);
      guestId = resolved.guestId;
      purchaseId = resolved.purchaseId;
      ambiguous = resolved.ambiguous;
      candidateGuestIds = resolved.candidateGuestIds;
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to resolve the guest identity." }, { status: 500 });
    }
  } else {
    const code = rawValue.toUpperCase();
    const { data: waiver, error: waiverError } = await supabase.from("camp_nackte_waivers").select("id, guest_id, full_name, email, phone, linked_day_pass_purchase_id, signed_at, status").eq("confirmation_number", code).maybeSingle();
    if (waiverError) return NextResponse.json({ error: waiverError.message }, { status: 500 });
    rawWaiverRowCount = waiver ? 1 : 0;
    if (waiver) {
      try {
        const resolved = await guestFromHistoricalWaivers([waiver as HistoricalWaiver]);
        guestId = resolved.guestId;
        purchaseId = resolved.purchaseId;
        ambiguous = resolved.ambiguous;
        candidateGuestIds = resolved.candidateGuestIds;
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link the historical waiver." }, { status: 500 });
      }
    } else {
      const { data: slot, error: slotError } = await supabase.from("day_pass_attendees").select("guest_id, purchase_id").eq("confirmation_code", code).maybeSingle();
      if (slotError) return NextResponse.json({ error: slotError.message }, { status: 500 });
      guestId = slot?.guest_id || null;
      purchaseId = slot?.purchase_id || null;
    }
  }

  const distinctGuestCandidateCount = guestId ? 1 : new Set(candidateGuestIds).size;
  if (!guestId && ambiguous) {
    logLookupDecision(rawWaiverRowCount, distinctGuestCandidateCount, "ambiguous");
    return ambiguityResponse(candidateGuestIds);
  }
  if (!guestId) {
    logLookupDecision(rawWaiverRowCount, 0, "no_match");
    return NextResponse.json({ found: false, message: "No matching guest was found." });
  }
  logLookupDecision(rawWaiverRowCount, 1, "resolved");
  return verifiedGuestResponse(guestId, purchaseId);
}
