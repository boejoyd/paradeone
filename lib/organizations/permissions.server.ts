import "server-only";

import { redirect } from "next/navigation";

import type { OrganizationRole } from "@/lib/auth";
import { requireUser } from "@/lib/auth";
import {
  hasOrganizationCapability,
  isOrganizationRole,
  type OrganizationCapability,
} from "@/lib/organizations/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrganizationMembership = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
};

export async function getCurrentOrganizationMembership(
  organizationId: string
): Promise<OrganizationMembership | null> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, user_id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !isOrganizationRole(data.role)) {
    return null;
  }

  return {
    organizationId: data.organization_id,
    userId: data.user_id,
    role: data.role,
  };
}

export async function requireOrganizationCapability(
  organizationId: string,
  capability: OrganizationCapability,
  redirectTo = "/organizations"
): Promise<OrganizationMembership> {
  const membership = await getCurrentOrganizationMembership(organizationId);

  if (
    !membership ||
    !hasOrganizationCapability(membership.role, capability)
  ) {
    redirect(redirectTo);
  }

  return membership;
}
