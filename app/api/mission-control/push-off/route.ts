import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isActiveParadeRequest } from "@/lib/activeParade.server";
import { sendMissionControlMessage } from "@/lib/mission-control/communications";
import { sendMissionControlSms } from "@/lib/mission-control/sms";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PushOffRequest = {
  organizationId?: unknown;
  eventId?: unknown;
  entryId?: unknown;
};

const PUSH_OFF_SMS_BODY =
  "ParadeOne: Your parade unit has been cleared to push off. Please begin moving now and keep your participant dashboard open.";

type EntrySnapshot = {
  id: string;
  event_id: string;
  name: string;
  parade_number: number | null;
  contact_phone: string | null;
  check_in_status: string | null;
  pushed_off_at: string | null;
  route_state: string;
  sms_opt_in: boolean;
};

async function validateMissionControlContext(organizationId: string, eventId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 }) };
  }

  if (!(await isActiveParadeRequest(eventId))) {
    return {
      error: NextResponse.json(
        { ok: false, error: "This parade is no longer active in Mission Control. Refresh and select it again." },
        { status: 409 }
      ),
    };
  }

  return { supabase };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as PushOffRequest | null;
  const organizationId = String(payload?.organizationId || "").trim();
  const eventId = String(payload?.eventId || "").trim();
  const entryId = String(payload?.entryId || "").trim();

  if (!organizationId || !eventId || !entryId) {
    return NextResponse.json(
      { ok: false, error: "Organization, event, and entry are required." },
      { status: 400 }
    );
  }

  const context = await validateMissionControlContext(organizationId, eventId);
  if ("error" in context) {
    return context.error;
  }

  const { data: entry, error: entryError } = await context.supabase
    .from("entries")
    .select(
      "id, event_id, name, parade_number, contact_phone, check_in_status, pushed_off_at, route_state, sms_opt_in"
    )
    .eq("id", entryId)
    .eq("event_id", eventId)
    .maybeSingle();

if (entryError) {
  return NextResponse.json(
    { ok: false, error: entryError.message },
    { status: 500 }
  );
}

if (!entry) {
  return NextResponse.json(
    { ok: false, error: "Entry not found." },
    { status: 404 }
  );
}


  const typedEntry = entry as EntrySnapshot;

  if (typedEntry.check_in_status === "moving" || typedEntry.pushed_off_at) {
    let checkInStatus = "moving";
    if (typedEntry.check_in_status !== "moving" || typedEntry.route_state === "staged") {
      const { data: repairedEntry, error: repairError } = await context.supabase
        .from("entries")
        .update({ check_in_status: "moving", route_state: "pushed_off", route_state_updated_at: typedEntry.pushed_off_at || new Date().toISOString() })
        .eq("id", entryId)
        .eq("event_id", eventId)
        .select("check_in_status")
        .single();
      if (repairError || !repairedEntry) {
        return NextResponse.json(
          { ok: false, error: repairError?.message || "Unable to restore moving status." },
          { status: 500 }
        );
      }
      checkInStatus = repairedEntry.check_in_status;
    }
    return NextResponse.json({
      ok: true,
      entryId,
      status: "moving",
      pushedOffAt: typedEntry.pushed_off_at,
      smsSent: false,
      alreadyPushedOff: true,
      entry: { id: entryId, checkInStatus, pushedOffAt: typedEntry.pushed_off_at },
    });
  }

  const pushedOffAt = new Date().toISOString();

  const { data: updatedEntry, error: updateError } = await context.supabase
    .from("entries")
    .update({
      check_in_status: "moving",
      pushed_off_at: pushedOffAt,
      route_state: "pushed_off",
      route_state_updated_at: pushedOffAt,
    })
    .eq("id", entryId)
    .eq("event_id", eventId)
    .is("pushed_off_at", null)
    .select(
      "id, event_id, name, parade_number, contact_phone, check_in_status, pushed_off_at, route_state, sms_opt_in"
    )
    .maybeSingle();

  if (updateError || !updatedEntry) {
    const { data: latestEntry } = await context.supabase
      .from("entries")
      .select("pushed_off_at, check_in_status")
      .eq("id", entryId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (latestEntry?.pushed_off_at || latestEntry?.check_in_status === "moving") {
      return NextResponse.json({
        ok: true,
        entryId,
        status: "moving",
        pushedOffAt: latestEntry.pushed_off_at,
        smsSent: false,
        alreadyPushedOff: true,
        entry: {
          id: entryId,
          checkInStatus: "moving",
          pushedOffAt: latestEntry.pushed_off_at,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: updateError?.message || "Unable to update push-off status." },
      { status: 500 }
    );
  }

  await context.supabase.from("entry_route_state_events").insert({
    event_id: eventId,
    entry_id: entryId,
    from_state: typedEntry.route_state,
    to_state: "pushed_off",
    transition_source: "push_off",
  });

  const outboundMessage = await sendMissionControlMessage({
    organizationId,
    eventId,
    channel: "parade_units",
    senderType: "coc",
    direction: "outbound",
    source: "app",
    paradeUnitId: entryId,
    unitName: typedEntry.name,
    entryNumber: typedEntry.parade_number,
    messageBody: PUSH_OFF_SMS_BODY,
    messageType: "chat",
  });

  let smsSent = false;
  let warning: string | undefined;

  try {
    const sms = await sendMissionControlSms({
      organizationId,
      eventId,
      missionControlMessageId: outboundMessage.id,
      messageBody: PUSH_OFF_SMS_BODY,
      channel: "parade_units",
      paradeUnitId: entryId,
    });
    smsSent = sms.queued > 0;
    if (sms.status !== "queued") warning = sms.message;
  } catch (error) {
    warning = error instanceof Error ? error.message : "Unit pushed off, but SMS failed.";
  }

  return NextResponse.json({
    ok: true,
    entryId,
    status: "moving",
    pushedOffAt,
    smsSent,
    warning,
    entry: {
      id: updatedEntry.id,
      checkInStatus: updatedEntry.check_in_status,
      pushedOffAt: updatedEntry.pushed_off_at,
    },
  });
}
