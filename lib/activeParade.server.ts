import { cookies } from "next/headers";

import { ACTIVE_PARADE_KEY } from "@/lib/activeParade";

export async function getActiveParadeId(): Promise<string | null> {
  return (await cookies()).get(ACTIVE_PARADE_KEY)?.value?.trim() || null;
}

export async function isActiveParadeRequest(eventId: string): Promise<boolean> {
  const activeParadeId = await getActiveParadeId();
  return Boolean(activeParadeId && activeParadeId === eventId);
}
