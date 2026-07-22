import { redirect } from "next/navigation";

import type { OrganizationRole } from "@/lib/auth";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ORGANIZATION_ROLE_OPTIONS: ReadonlyArray<{
  id: OrganizationRole;
  label: string;
  description: string;
}> = [
  {
    id: "owner",
    label: "Owner",
    description:
      "Full organization control, including accounts, roles, and destructive settings.",
  },
  {
    id: "admin",
    label: "Admin",
    description:
      "Manages parade setup and operations, plus Staff and Volunteer accounts.",
  },
  {
    id: "staff",
    label: "Staff",
    description:
      "Creates and edits parades, entries, staging, lineups, and route operations.",
  },
  {
    id: "volunteer",
    label: "Volunteer",
    description:
      "Uses live operational tools and views organization information without setup control.",
  },
];

export const ORGANIZATION_CAPABILITIES = [
  "manageOrganization",
  "manageMembers",
  "assignOwnerRole",
  "createEvents",
  "editEvents",
  "deleteEvents",
  "manageEntries",
  "manageStaging",
  "operateMissionControl",
  "manageRoutes",
] as const;

export type OrganizationCapability =
  (typeof ORGANIZATION_CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<
  OrganizationRole,
  ReadonlySet<OrganizationCapability>
> = {
  owner: new Set(ORGANIZATION_CAPABILITIES),
  admin: new Set([
    "manageOrganization",
    "manageMembers",
    "createEvents",
    "editEvents",
    "manageEntries",
    "manageStaging",
    "operateMissionControl",
    "manageRoutes",
  ]),
  staff: new Set([
    "createEvents",
    "editEvents",
    "manageEntries",
    "manageStaging",
    "operateMissionControl",
    "manageRoutes",
  ]),
  volunteer: new Set(["manageStaging", "operateMissionControl"]),
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    ORGANIZATION_ROLE_OPTIONS.some((role) => role.id === value)
  );
}

export function hasOrganizationCapability(
  role: OrganizationRole,
  capability: OrganizationCapability
): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function canManageOrganizationUsers(
  role: OrganizationRole
): role is "owner" | "admin" {
  return hasOrganizationCapability(role, "manageMembers");
}

export function canAssignOrganizationRole(
  managerRole: OrganizationRole,
  assignedRole: OrganizationRole
): boolean {
  if (assignedRole === "owner") {
    return hasOrganizationCapability(managerRole, "assignOwnerRole");
  }

  return hasOrganizationCapability(managerRole, "manageMembers");
}

export function canManageOrganizationMember(
  managerRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  if (managerRole === "owner") return true;
  return managerRole === "admin" && targetRole !== "owner";
}

export function getAssignableOrganizationRoles(managerRole: OrganizationRole) {
  return ORGANIZATION_ROLE_OPTIONS.filter((role) =>
    canAssignOrganizationRole(managerRole, role.id)
  );
}

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
