"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(name);

  await requireOrganizationRole(organizationId, ["owner", "admin"]);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("organizations")
    .update({ name, slug })
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  redirect(`/organizations/${slug}`);
}
