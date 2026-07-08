"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function deleteOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");

  await requireOrganizationRole(organizationId, ["owner"]);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/organizations");
}
