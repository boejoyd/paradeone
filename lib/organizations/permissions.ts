import type { OrganizationRole } from "@/lib/auth";

export const ORGANIZATION_ROLE_OPTIONS: ReadonlyArray<{
  id: OrganizationRole;
  label: string;
  description: string;
}> = [
  {
    id: "owner",
    label: "Owner",
    description: "Full organization control, including accounts, roles, and destructive settings.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Manages parade setup and operations, plus Staff and Volunteer accounts.",
  },
  {
    id: "staff",
    label: "Staff",
    description: "Creates and edits parades, entries, staging, lineups, and route operations.",
  },
  {
    id: "volunteer",
    label: "Volunteer",
    description: "Uses live operational tools and views organization information without setup control.",
  },
];

export function isOrganizationRole(value: string): value is OrganizationRole {
  return ORGANIZATION_ROLE_OPTIONS.some((role) => role.id === value);
}

export function canManageOrganizationUsers(
  role: OrganizationRole
): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}

export function canAssignOrganizationRole(
  managerRole: OrganizationRole,
  assignedRole: OrganizationRole
): boolean {
  if (managerRole === "owner") return true;
  if (managerRole === "admin") return assignedRole === "staff" || assignedRole === "volunteer";
  return false;
}

export function getAssignableOrganizationRoles(managerRole: OrganizationRole) {
  return ORGANIZATION_ROLE_OPTIONS.filter((role) =>
    canAssignOrganizationRole(managerRole, role.id)
  );
}
