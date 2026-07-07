"use server";

import { redirect } from "next/navigation";
import { requireOrganizationAccess, requireUser } from "@/lib/auth";
import { sendMissionControlMessage } from "@/lib/mission-control/communications";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function sendMissionControlMessageAction(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();
  const organizationId = String(formData.get("organizationId") || "").trim();

  await requireOrganizationAccess(organizationId);
  const user = await requireUser();

  await sendMissionControlMessage({
    organizationId,
    eventId,
    senderUserId: user.id,
    senderType: "coc",
    senderName: String(formData.get("senderName") || "").trim(),
    senderRole: "COC",
    unitName: String(formData.get("unitName") || "").trim() || null,
    entryNumber: parseOptionalNumber(formData.get("entryNumber")),
    messageBody: String(formData.get("messageBody") || "").trim(),
    messageType: "chat",
  });

  redirect(`/organizations/${slug}/parades/${eventId}#communications`);
}
