"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createParade(formData: FormData) {
  const paradeName = String(formData.get("paradeName") || "").trim();
  const organizationName = String(formData.get("organizationName") || "").trim();
  const paradeDate = String(formData.get("paradeDate") || "");
  const startTime = String(formData.get("startTime") || "");
  const city = String(formData.get("city") || "").trim();
  const expectedEntries = Number(formData.get("expectedEntries") || 0);
  const stagingSections = Number(formData.get("stagingSections") || 0);

  const organizationSlug = slugify(organizationName);

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .upsert(
      { name: organizationName, slug: organizationSlug },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const { error: eventError } = await supabase.from("events").insert({
    organization_id: organization.id,
    name: paradeName,
    event_date: paradeDate || null,
    start_time: startTime || null,
    city: city || null,
    expected_entries: expectedEntries || null,
    staging_sections: stagingSections || null,
    status: "draft",
  });

  if (eventError) {
    throw new Error(eventError.message);
  }

  redirect("/");
}
