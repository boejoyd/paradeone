import { requireOrganizationRole, requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrganizationRole = "owner" | "admin" | "staff" | "volunteer";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getUniqueSlug(baseSlug: string) {
  const supabase = await createServerSupabaseClient();
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createOrganization(input: {
  name: string;
  slugInput?: string;
  description?: string;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  const slugInput = input.slugInput?.trim();
  const description = input.description?.trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const baseSlug = slugInput || slugify(name);
  const slug = await getUniqueSlug(baseSlug);
  const supabase = await createServerSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      description: description || null,
    })
    .select("id")
    .single();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  await addOwnerMembership(organization.id, user.id);

  return { organizationId: organization.id, slug };
}

export async function addOwnerMembership(organizationId: string, userId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: userId,
    role: "owner",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function assertOwnerRole(organizationId: string) {
  await requireOrganizationRole(organizationId, ["owner"]);
}
