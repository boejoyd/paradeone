import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";

import { processQuickBooksWebhookEvent } from "@/lib/quickbooksWaiverSync";
import { verifyQuickBooksWebhook } from "@/lib/quickbooks";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type EntityEvent = { name?: string; id?: string; operation?: string; lastUpdated?: string };
type Notification = { realmId?: string; dataChangeEvent?: { entities?: EntityEvent[] } };

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (!verifyQuickBooksWebhook(rawBody, request.headers.get("intuit-signature"))) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "QuickBooks webhook verification is not configured." }, { status: 503 });
  }

  const body = JSON.parse(rawBody) as { eventNotifications?: Notification[] };
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
  const acceptedIds: string[] = [];

  for (const notification of body.eventNotifications || []) {
    const realmId = String(notification.realmId || "");
    for (const entity of notification.dataChangeEvent?.entities || []) {
      const entityName = String(entity.name || "");
      const entityId = String(entity.id || "");
      const operation = String(entity.operation || "");
      if (!realmId || !entityName || !entityId || !operation) continue;
      const eventKey = createHash("sha256").update(`${realmId}:${entityName}:${entityId}:${operation}:${entity.lastUpdated || ""}`).digest("hex");
      const { data, error } = await supabase.from("quickbooks_webhook_events").upsert({
        event_key: eventKey,
        realm_id: realmId,
        entity_name: entityName,
        entity_id: entityId,
        operation,
        event_time: entity.lastUpdated || null,
        payload: entity,
      }, { onConflict: "event_key", ignoreDuplicates: true }).select("id").maybeSingle();
      if (!error && data?.id) acceptedIds.push(data.id);
    }
  }
  after(async () => {
    for (const id of acceptedIds) await processQuickBooksWebhookEvent(id);
  });
  return NextResponse.json({ accepted: true });
}
