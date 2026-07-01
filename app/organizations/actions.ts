"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function deleteOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/organizations");
}
