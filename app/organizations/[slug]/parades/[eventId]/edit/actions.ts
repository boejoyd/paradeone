"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function updateParade(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");

  const { error } = await supabase
    .from("events")
    .update({
      name: String(formData.get("name") || "").trim(),
      event_date: String(formData.get("eventDate") || "") || null,
      start_time: String(formData.get("startTime") || "") || null,
      city: String(formData.get("city") || "").trim() || null,
      expected_entries: Number(formData.get("expectedEntries") || 0) || null,
      staging_sections: Number(formData.get("stagingSections") || 0) || null,
      status: String(formData.get("status") || "draft"),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}/parades/${eventId}`);
}
export async function deleteParade(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}`);
}
