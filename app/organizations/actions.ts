"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function deleteOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  redirect("/organizations");
}

export async function deleteParade(formData: FormData) {
  const organizationSlug = String(formData.get("organizationSlug") || "");
  const eventId = String(formData.get("eventId") || "");

  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${organizationSlug}`);
}
