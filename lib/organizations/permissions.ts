import type { OrganizationRole } from "@/lib/auth";

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
