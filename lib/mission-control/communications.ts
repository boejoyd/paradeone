import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrganizationAccess } from "@/lib/auth";

export type MissionControlSenderType =
  | "coc"
  | "parade_unit"
  | "volunteer"
  | "section_captain"
  | "float"
  | "system";
export type MissionControlMessageType = "chat" | "status" | "assistance" | "system";
export type MissionControlChannel =
  | "broadcast"
  | "parade_units"
  | "volunteers"
  | "section_captains";
export type MissionControlDirection = "inbound" | "outbound";
export type MissionControlSource = "app" | "sms";

export type MissionControlMessage = {
  id: string;
  organization_id: string;
  event_id: string | null;
  channel: MissionControlChannel;
  parade_unit_id: string | null;
  volunteer_id: string | null;
  sender_user_id: string | null;
  sender_type: MissionControlSenderType;
  sender_name: string | null;
  sender_phone: string | null;
  sender_role: string | null;
  unit_name: string | null;
  entry_number: number | null;
  message_body: string;
  message_type: MissionControlMessageType;
  direction: MissionControlDirection;
  source: MissionControlSource;
  created_at: string;
};

export type ListMissionControlMessagesInput = {
  organizationId: string;
  eventId?: string;
  paradeUnitId?: string;
  channel?: MissionControlChannel;
  limit?: number;
};

export type SendMissionControlMessageInput = {
  organizationId: string;
  eventId?: string | null;
  channel?: MissionControlChannel;
  paradeUnitId?: string | null;
  volunteerId?: string | null;
  senderUserId?: string | null;
  senderType?: MissionControlSenderType;
  senderName?: string | null;
  senderPhone?: string | null;
  senderRole?: string | null;
  unitName?: string | null;
  entryNumber?: number | null;
  messageBody: string;
  messageType?: MissionControlMessageType;
  direction?: MissionControlDirection;
  source?: MissionControlSource;
};

const MESSAGE_SELECT = `
  id,
  organization_id,
  event_id,
  channel,
  parade_unit_id,
  volunteer_id,
  sender_user_id,
  sender_type,
  sender_name,
  sender_phone,
  sender_role,
  unit_name,
  entry_number,
  message_body,
  message_type,
  direction,
  source,
  created_at
`;

function isMissingMissionControlMessagesTableError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): boolean {
  const code = error.code ?? "";
  const combined = [error.message, error.details, error.hint]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (code === "42P01" || code === "PGRST205") {
    return combined.includes("mission_control_messages");
  }

  return (
    combined.includes("mission_control_messages") &&
    (combined.includes("does not exist") ||
      combined.includes("cannot be found") ||
      combined.includes("schema cache"))
  );
}

function sanitizeText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseChannel(value: string | null | undefined): MissionControlChannel {
  if (
    value === "broadcast" ||
    value === "parade_units" ||
    value === "volunteers" ||
    value === "section_captains"
  ) {
    return value;
  }

  return "broadcast";
}

export async function listMissionControlMessages(
  input: ListMissionControlMessagesInput
): Promise<MissionControlMessage[]> {
  await requireOrganizationAccess(input.organizationId);
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("mission_control_messages")
    .select(MESSAGE_SELECT)
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: true })
    .limit(input.limit ?? 200);

  if (input.eventId) {
    query = query.eq("event_id", input.eventId);
  }

  if (input.paradeUnitId) {
    query = query.eq("parade_unit_id", input.paradeUnitId);
  }

  if (input.channel) {
    query = query.eq("channel", input.channel);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingMissionControlMessagesTableError(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as MissionControlMessage[];
}

export async function sendMissionControlMessage(
  input: SendMissionControlMessageInput
): Promise<MissionControlMessage> {
  const supabase = await createServerSupabaseClient();
  const messageBody = input.messageBody.trim();

  if (!messageBody) {
    throw new Error("Message body is required.");
  }

  const { data, error } = await supabase
    .from("mission_control_messages")
    .insert({
      organization_id: input.organizationId,
      event_id: input.eventId ?? null,
      channel: parseChannel(input.channel),
      parade_unit_id: input.paradeUnitId ?? null,
      volunteer_id: input.volunteerId ?? null,
      sender_user_id: input.senderUserId ?? null,
      sender_type: input.senderType ?? "coc",
      sender_name: sanitizeText(input.senderName),
      sender_phone: sanitizeText(input.senderPhone),
      sender_role: sanitizeText(input.senderRole),
      unit_name: sanitizeText(input.unitName),
      entry_number: input.entryNumber ?? null,
      message_body: messageBody,
      message_type: input.messageType ?? "chat",
      direction: input.direction ?? "outbound",
      source: input.source ?? "app",
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MissionControlMessage;
}
