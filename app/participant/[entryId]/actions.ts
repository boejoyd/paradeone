"use server";

import { redirect } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getParticipantTokenPayload } from "@/lib/participantToken";

type ParticipantStatus = "getting_ready" | "ready" | "needs_assistance";

const allowedStatuses: ParticipantStatus[] = [
  "getting_ready",
  "ready",
  "needs_assistance",
];

function participantRoute(token: string, message?: string) {
  const encodedToken = encodeURIComponent(token);

  if (!message) {
    return `/participant/${encodedToken}`;
  }

  const params = new URLSearchParams({ message });
  return `/participant/${encodedToken}?${params.toString()}`;
}

export async function updateParticipantStatus(formData: FormData) {
  const token = String(formData.get("token") || "");
  const requestedStatus = String(formData.get("status") || "") as ParticipantStatus;
  const payload = await getParticipantTokenPayload(token);

  if (!payload || !allowedStatuses.includes(requestedStatus)) {
    redirect(participantRoute(token, "Unable to update status."));
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", payload.eventId)
    .single();

  if (eventError || !event || event.organization_id !== payload.organizationId) {
    redirect(participantRoute(token, "Unable to verify event access."));
  }

  const { error: updateError } = await supabase
    .from("entries")
    .update({ check_in_status: requestedStatus })
    .eq("id", payload.entryId)
    .eq("event_id", payload.eventId);

  if (updateError) {
    redirect(participantRoute(token, "Status update failed. Try again."));
  }

  redirect(participantRoute(token, "Status updated."));
}