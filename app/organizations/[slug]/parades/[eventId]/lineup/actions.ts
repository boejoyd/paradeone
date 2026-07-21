"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function autoNumberLineup(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");
  const supabase = await createServerSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event?.organization_id) {
    throw new Error(eventError?.message || "Parade not found.");
  }

  await requireOrganizationRole(event.organization_id, ["owner", "admin", "staff"]);

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["approved", "assigned"])
    .order("lineup_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  for (let index = 0; index < (entries || []).length; index++) {
    const position = index + 1;

    const { error: updateError } = await supabase
      .from("entries")
      .update({
        lineup_position: position,
        parade_number: position,
        status: "assigned",
      })
      .eq("id", entries[index].id);

    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath(`/organizations/${slug}/parades/${eventId}/lineup`);
}
