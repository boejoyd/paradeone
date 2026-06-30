"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function createEntry(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const eventId = String(formData.get("eventId") || "");

  const { error } = await supabase.from("entries").insert({
    event_id: eventId,
    name: String(formData.get("name") || "").trim(),
    entry_type: String(formData.get("entryType") || "float"),
    status: "draft",
    contact_name: String(formData.get("contactName") || "").trim() || null,
    contact_email: String(formData.get("contactEmail") || "").trim() || null,
    contact_phone: String(formData.get("contactPhone") || "").trim() || null,
    announcer_script:
      String(formData.get("announcerScript") || "").trim() || null,
    estimated_length_feet:
      Number(formData.get("estimatedLengthFeet") || 0) || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/organizations/${slug}/parades/${eventId}/entries`);
}
