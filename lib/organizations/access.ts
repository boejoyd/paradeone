import { redirect } from "next/navigation";

import { requireOrganizationAccess, requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
};

export type AccessibleEvent = {
  id: string;
  name: string;
  organization_id: string;
};

export async function listAccessibleOrganizations(): Promise<AccessibleOrganization[]> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const organizationIds = (memberships ?? [])
    .map((membership) => membership.organization_id)
    .filter((id): id is string => typeof id === "string");

  if (organizationIds.length === 0) {
    return [];
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .in("id", organizationIds)
    .order("created_at", { ascending: false });

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  return (organizations ?? []) as AccessibleOrganization[];
}

export async function requireAccessibleOrganizationBySlug(
  slug: string
): Promise<AccessibleOrganization> {
  const supabase = await createServerSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !organization?.id) {
    redirect("/organizations");
  }

  await requireOrganizationAccess(organization.id);

  return organization as AccessibleOrganization;
}

export async function requireAccessibleEventContext(
  slug: string,
  eventId: string
): Promise<{ organization: AccessibleOrganization; event: AccessibleEvent }> {
  const organization = await requireAccessibleOrganizationBySlug(slug);
  const supabase = await createServerSupabaseClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, organization_id")
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (error || !event?.id) {
    redirect(`/organizations/${organization.slug}`);
  }

  return {
    organization,
    event: event as AccessibleEvent,
  };
}
