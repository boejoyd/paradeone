"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sendMissionControlMessage } from "@/lib/mission-control/communications";
import { requireOrganizationCapability } from "@/lib/organizations/permissions";

export type SendMissionControlChatMessageState = {
  status: "idle" | "success" | "error";
  message: string | null;
  submissionId: number;
};

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSenderType(
  value: FormDataEntryValue | null
): "coc" | "parade_unit" | "volunteer" | "section_captain" {
  const senderType = String(value || "").trim();

  if (
    senderType === "coc" ||
    senderType === "parade_unit" ||
    senderType === "volunteer" ||
    senderType === "section_captain"
  ) {
    return senderType;
  }

  return "coc";
}

function parseChannel(
  value: FormDataEntryValue | null
): "broadcast" | "parade_units" | "volunteers" | "section_captains" {
  const channel = String(value || "").trim();

  if (
    channel === "broadcast" ||
    channel === "parade_units" ||
    channel === "volunteers" ||
    channel === "section_captains"
  ) {
    return channel;
  }

  return "broadcast";
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

export async function sendMissionControlChatMessageAction(
  _previousState: SendMissionControlChatMessageState,
  formData: FormData
): Promise<SendMissionControlChatMessageState> {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();

  if (!organizationId) {
    return {
      status: "error",
      message: "Organization context is required.",
      submissionId: Date.now(),
    };
  }

  try {
    await requireOrganizationCapability(
      organizationId,
      "operateMissionControl",
      "/organizations"
    );
    const user = await requireUser();

    const senderType = parseSenderType(formData.get("senderType"));
    const channel = parseChannel(formData.get("channel"));
    const messageType = parseMessageType(formData.get("messageType"));

    await sendMissionControlMessage({
      organizationId,
      eventId: eventId || null,
      senderUserId: user.id,
      senderType,
      channel,
      senderName: String(formData.get("senderName") || "").trim(),
      senderRole: "COC",
      unitName: String(formData.get("unitName") || "").trim() || null,
      entryNumber: parseOptionalNumber(formData.get("entryNumber")),
      messageBody: String(formData.get("messageBody") || "").trim(),
      messageType,
      source: "app",
      direction: "outbound",
    });
    revalidatePath("/");
    revalidatePath("/mission-control/chat");

    return {
      status: "success",
      message: null,
      submissionId: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to send message.",
      submissionId: Date.now(),
    };
  }
}
