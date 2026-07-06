"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOrganization as createOrganizationService } from "@/lib/organizations/service";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();

  const { slug } = await createOrganizationService({
    name,
    slugInput,
    description,
  });

  revalidatePath("/organizations");
  redirect(`/organizations/${slug}`);
}
