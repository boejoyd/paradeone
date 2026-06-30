"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function autoNumberLineup(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id")
    .eq("event_id", eventId)
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
      })
      .eq("id", entries[index].id);

    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath(`/organizations/${slug}/parades/${eventId}/lineup`);
}
