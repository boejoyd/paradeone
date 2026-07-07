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

function parseSenderType(value: FormDataEntryValue | null): "coc" | "float" | "volunteer" | "system" {
  const senderType = String(value || "").trim();

  if (
    senderType === "coc" ||
    senderType === "float" ||
    senderType === "volunteer" ||
    senderType === "system"
  ) {
    return senderType;
  }

  return "coc";
}

function parseMessageType(value: FormDataEntryValue | null): "chat" | "status" | "assistance" | "system" {
  const messageType = String(value || "").trim();

  if (
    messageType === "chat" ||
    messageType === "status" ||
    messageType === "assistance" ||
    messageType === "system"
  ) {
    return messageType;
  }

  return "chat";
}

export async function sendMissionControlChatMessageAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();

  if (!organizationId) {
    throw new Error("Organization context is required.");
  }

  await requireOrganizationAccess(organizationId);
  const user = await requireUser();

  const senderType = parseSenderType(formData.get("senderType"));
  const messageType = parseMessageType(formData.get("messageType"));

  await sendMissionControlMessage({
    organizationId,
    eventId: eventId || null,
    senderUserId: user.id,
    senderType,
    senderName: String(formData.get("senderName") || "").trim(),
    senderRole: senderType === "system" ? "SYSTEM" : "COC",
    unitName: String(formData.get("unitName") || "").trim() || null,
    entryNumber: parseOptionalNumber(formData.get("entryNumber")),
    messageBody: String(formData.get("messageBody") || "").trim(),
    messageType,
  });

  redirect("/#chat");
}
