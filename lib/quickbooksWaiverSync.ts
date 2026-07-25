import "server-only";

import { randomBytes } from "node:crypto";

import { fetchQuickBooksEntity, quickBooksDayPassItemIds } from "@/lib/quickbooks";
import { normalizeCampPhone } from "@/lib/campNackteWaiver";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Ref = { value?: string; name?: string };
type QboLine = { Id?: string; Amount?: number; Description?: string; SalesItemLineDetail?: { ItemRef?: Ref; Qty?: number } };
type QboReceipt = {
  Id?: string; SyncToken?: string; TxnDate?: string; CustomerRef?: Ref;
  BillEmail?: { Address?: string }; BillAddr?: { Line1?: string };
  Line?: QboLine[]; PrivateNote?: string;
  LinkedTxn?: { TxnId?: string; TxnType?: string }[];
};

function dayPassLines(receipt: QboReceipt) {
  const configuredIds = quickBooksDayPassItemIds();
  if (configuredIds.size === 0) throw new Error("QUICKBOOKS_DAY_PASS_ITEM_IDS is not configured.");
  return (receipt.Line || []).filter((line) => configuredIds.has(String(line.SalesItemLineDetail?.ItemRef?.value || "")));
}

async function sendWaiverEmail(recipient: string, confirmationCode: string, purchaseId: string, guestId: string | null) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return;
  const { data: queued, error } = await supabase.from("quickbooks_waiver_notifications").insert({
    purchase_id: purchaseId,
    guest_id: guestId,
    recipient_email: recipient,
  }).select("id").maybeSingle();
  if (error || !queued) return;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CAMP_NACKTE_WAIVER_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    await supabase.from("quickbooks_waiver_notifications").update({ status: "failed", last_error: "Email delivery is not configured." }).eq("id", queued.id);
    return;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.paradeone.com").replace(/\/$/, "");
  const waiverUrl = `${baseUrl}/camp-nackte/waiver?confirmation=${encodeURIComponent(confirmationCode)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: "Complete your Camp Nackte annual waiver",
      html: `<p>Your Camp Nackte day pass was received.</p><p><a href="${waiverUrl}">Check or sign your annual waiver</a> before arrival.</p><p>If your waiver is current, ParadeOne will confirm the anniversary expiration date and you will not need to sign again.</p>`,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  await supabase.from("quickbooks_waiver_notifications").update(response.ok ? {
    status: "sent", provider_message_id: payload.id || null, sent_at: new Date().toISOString(), last_error: null,
  } : {
    status: "failed", last_error: payload.message || `Email provider returned ${response.status}.`,
  }).eq("id", queued.id);
}

async function customerForReceipt(realmId: string, receipt: QboReceipt) {
  const customerId = receipt.CustomerRef?.value || null;
  if (!customerId) return null;
  const entity = await fetchQuickBooksEntity(realmId, "Customer", customerId).catch(() => undefined);
  return entity as { DisplayName?: string; PrimaryEmailAddr?: { Address?: string }; PrimaryPhone?: { FreeFormNumber?: string } } | undefined;
}

export async function processQuickBooksWebhookEvent(eventId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return;
  const { data: claimed } = await supabase.from("quickbooks_webhook_events")
    .update({ status: "processing" }).eq("id", eventId).in("status", ["pending", "failed"])
    .select("*").maybeSingle();
  if (!claimed) return;
  try {
    if (!["SalesReceipt", "RefundReceipt"].includes(claimed.entity_name)) {
      await supabase.from("quickbooks_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", eventId);
      return;
    }
    if (["Delete", "Void"].includes(claimed.operation)) {
      await supabase.from("day_pass_purchases").update({
        status: "voided",
        synced_at: new Date().toISOString(),
      }).eq("quickbooks_sales_receipt_id", claimed.entity_id);
      await supabase.from("quickbooks_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", eventId);
      return;
    }
    if (claimed.entity_name === "RefundReceipt") {
      const refund = await fetchQuickBooksEntity(claimed.realm_id, "RefundReceipt", claimed.entity_id) as QboReceipt | undefined;
      const receiptIds = (refund?.LinkedTxn || []).filter((item) => item.TxnType === "SalesReceipt" && item.TxnId).map((item) => item.TxnId as string);
      if (receiptIds.length > 0) {
        await supabase.from("day_pass_purchases").update({ status: "refunded", synced_at: new Date().toISOString() }).in("quickbooks_sales_receipt_id", receiptIds);
      }
      await supabase.from("quickbooks_webhook_events").update({ status: receiptIds.length ? "processed" : "ignored", processed_at: new Date().toISOString() }).eq("id", eventId);
      return;
    }

    const entity = await fetchQuickBooksEntity(claimed.realm_id, "SalesReceipt", claimed.entity_id);
    if (!entity) throw new Error("QuickBooks did not return the sales receipt.");
    const receipt = entity as QboReceipt;
    const lines = dayPassLines(receipt);
    if (lines.length === 0) {
      await supabase.from("quickbooks_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", eventId);
      return;
    }
    const customer = await customerForReceipt(claimed.realm_id, receipt);
    const email = customer?.PrimaryEmailAddr?.Address?.trim().toLowerCase() || receipt.BillEmail?.Address?.trim().toLowerCase() || null;
    const rawPhone = customer?.PrimaryPhone?.FreeFormNumber || "";
    const phone = rawPhone ? normalizeCampPhone(rawPhone) : null;
    const purchaserName = customer?.DisplayName || receipt.CustomerRef?.name || receipt.BillAddr?.Line1 || "QuickBooks customer";

    let guestId: string | null = null;
    const candidateGuestIds = new Set<string>();
    const quickbooksCustomerId = receipt.CustomerRef?.value || null;
    if (quickbooksCustomerId) {
      const { data } = await supabase.from("camp_guests").select("id").eq("quickbooks_customer_id", quickbooksCustomerId).maybeSingle();
      if (data?.id) candidateGuestIds.add(data.id);
    }
    if (!guestId && email) {
      const { data } = await supabase.from("camp_guests").select("id").eq("normalized_email", email).limit(2);
      for (const guest of data || []) candidateGuestIds.add(guest.id);
    }
    if (!guestId && phone?.length === 10) {
      const { data } = await supabase.from("camp_guests").select("id").eq("normalized_phone", phone).limit(2);
      for (const guest of data || []) candidateGuestIds.add(guest.id);
    }
    const matchStatus = candidateGuestIds.size > 1 ? "ambiguous" : candidateGuestIds.size === 1 ? "matched" : "unmatched";
    if (candidateGuestIds.size === 1) guestId = [...candidateGuestIds][0];
    if (!guestId && matchStatus === "unmatched") {
      const { data: guest, error } = await supabase.from("camp_guests").insert({
        quickbooks_customer_id: quickbooksCustomerId,
        legal_name: purchaserName,
        email,
        phone,
      }).select("id").single();
      if (error || !guest) throw new Error(error?.message || "Unable to create guest.");
      guestId = guest.id;
    } else if (quickbooksCustomerId) {
      await supabase.from("camp_guests").update({ quickbooks_customer_id: quickbooksCustomerId }).eq("id", guestId).is("quickbooks_customer_id", null);
    }

    for (const line of lines) {
      const quantity = Math.max(1, Math.floor(Number(line.SalesItemLineDetail?.Qty || 1)));
      const { data: purchase, error } = await supabase.from("day_pass_purchases").upsert({
        quickbooks_sales_receipt_id: receipt.Id || claimed.entity_id,
        quickbooks_customer_id: quickbooksCustomerId,
        quickbooks_line_id: line.Id || line.SalesItemLineDetail?.ItemRef?.value || "day-pass",
        purchaser_name: purchaserName,
        purchaser_email: email,
        purchaser_phone: phone,
        purchase_date: receipt.TxnDate || new Date().toISOString().slice(0, 10),
        quantity,
        source: "quickbooks",
        status: "active",
        match_status: matchStatus,
        quickbooks_sync_token: receipt.SyncToken || null,
        raw_quickbooks_payload: receipt,
        synced_at: new Date().toISOString(),
      }, { onConflict: "quickbooks_sales_receipt_id,quickbooks_line_id" }).select("id").single();
      if (error || !purchase) throw new Error(error?.message || "Unable to save day-pass purchase.");
      for (let slot = 1; slot <= quantity; slot += 1) {
        await supabase.from("day_pass_attendees").upsert({
          purchase_id: purchase.id,
          slot_number: slot,
          guest_id: slot === 1 ? guestId : null,
          attendee_name: slot === 1 ? purchaserName : null,
          confirmation_code: `CN-${randomBytes(5).toString("hex").toUpperCase()}`,
        }, { onConflict: "purchase_id,slot_number", ignoreDuplicates: true });
      }
      await supabase.from("day_pass_attendees").delete().eq("purchase_id", purchase.id).gt("slot_number", quantity);
      if (guestId && email) {
        const { data: currentWaiver } = await supabase.from("camp_nackte_waivers").select("id").eq("guest_id", guestId).eq("status", "current").gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
        if (!currentWaiver) {
          const { data: firstSlot } = await supabase.from("day_pass_attendees").select("confirmation_code").eq("purchase_id", purchase.id).eq("slot_number", 1).single();
          if (firstSlot?.confirmation_code) await sendWaiverEmail(email, firstSlot.confirmation_code, purchase.id, guestId);
        }
      }
    }
    await supabase.from("quickbooks_webhook_events").update({ status: "processed", processed_at: new Date().toISOString(), last_error: null }).eq("id", eventId);
  } catch (error) {
    await supabase.from("quickbooks_webhook_events").update({
      status: "failed",
      attempts: Number(claimed.attempts || 0) + 1,
      last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown processing failure",
    }).eq("id", eventId);
  }
}
