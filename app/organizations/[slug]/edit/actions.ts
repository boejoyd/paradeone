"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertOwnerRole,
  slugify,
} from "@/lib/organizations/service";

export async function updateOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const requestedSlug = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const slug = slugify(requestedSlug || name);

  if (!organizationId || !name) {
    throw new Error("Organization name is required.");
  }

  await assertOwnerRole(organizationId);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      slug,
      description: description || null,
    })
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/organizations");
  redirect(`/organizations/${slug}`);
}

export async function archiveOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "").trim();

  if (!organizationId) {
    throw new Error("Organization id is required.");
  }

  await assertOwnerRole(organizationId);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", organizationId)
    .is("archived_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/organizations");
  redirect("/organizations");
}
