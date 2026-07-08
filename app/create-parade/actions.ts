"use server";

import { redirect } from "next/navigation";
import { requireOrganizationRole, requireUser } from "@/lib/auth";
import { ensureOrganizationMembership } from "@/lib/organizations/memberships";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createParade(formData: FormData) {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const paradeName = String(formData.get("paradeName") || "").trim();
  const organizationName = String(formData.get("organizationName") || "").trim();
  const paradeDate = String(formData.get("paradeDate") || "");
  const startTime = String(formData.get("startTime") || "");
  const city = String(formData.get("city") || "").trim();
  const expectedEntries = Number(formData.get("expectedEntries") || 0);
  const stagingSections = Number(formData.get("stagingSections") || 0);

  const organizationSlug = slugify(organizationName);

  if (!paradeName || !organizationName || !organizationSlug) {
    throw new Error("Parade name and organization name are required.");
  }

  const { data: existingOrganization, error: existingOrganizationError } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", organizationSlug)
    .maybeSingle();

  if (existingOrganizationError) {
    throw new Error(existingOrganizationError.message);
  }

  let organization = existingOrganization;

  if (organization) {
    await requireOrganizationRole(organization.id, ["owner", "admin", "staff"]);
  } else {
    const { data: createdOrganization, error: organizationError } = await supabase
      .from("organizations")
      .insert({ name: organizationName, slug: organizationSlug })
      .select("id, slug")
      .single();

    if (organizationError) {
      throw new Error(organizationError.message);
    }

    organization = createdOrganization;

    await ensureOrganizationMembership({
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
      role: "owner",
    });
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
