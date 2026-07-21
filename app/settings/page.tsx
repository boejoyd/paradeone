import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import {
  LocalUserAccountForm,
  type ManageableOrganizationOption,
} from "@/components/settings/LocalUserAccountForm";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Card } from "@/components/ui/Card";
import { requireUser, type OrganizationRole } from "@/lib/auth";
import {
  canManageOrganizationUsers,
  ORGANIZATION_ROLE_OPTIONS,
} from "@/lib/organizations/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  member_email: string | null;
  role: OrganizationRole;
  created_at: string;
};

function getRoleLabel(role: OrganizationRole): string {
  return ORGANIZATION_ROLE_OPTIONS.find((option) => option.id === role)?.label ?? role;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const requiresPasswordChange = user.app_metadata?.requires_password_change === true;

  const { data: managementMemberships, error: managementMembershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"]);

  if (managementMembershipsError) {
    throw new Error(managementMembershipsError.message);
  }

  const managerRoleByOrganization = new Map<string, "owner" | "admin">();
  for (const membership of managementMemberships ?? []) {
    const role = membership.role as OrganizationRole;
    if (canManageOrganizationUsers(role)) {
      managerRoleByOrganization.set(membership.organization_id, role);
    }
  }

  const manageableOrganizationIds = [...managerRoleByOrganization.keys()];
  let manageableOrganizations: ManageableOrganizationOption[] = [];
  let managedMembers: MembershipRow[] = [];

  if (manageableOrganizationIds.length > 0) {
    const [{ data: organizations, error: organizationsError }, { data: members, error: membersError }] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug")
          .in("id", manageableOrganizationIds)
          .order("name", { ascending: true }),
        supabase
          .from("organization_members")
          .select("id, organization_id, user_id, member_email, role, created_at")
          .in("organization_id", manageableOrganizationIds)
          .order("created_at", { ascending: true }),
      ]);

    if (organizationsError) {
      throw new Error(organizationsError.message);
    }

    if (membersError) {
      throw new Error(membersError.message);
    }

    manageableOrganizations = (organizations ?? []).map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: managerRoleByOrganization.get(organization.id) ?? "admin",
    }));
    managedMembers = (members ?? []) as MembershipRow[];
  }

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Settings" }]} />

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Settings</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight">Account &amp; Access</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Manage your ParadeOne appearance, password, and organization user access.
        </p>
      </div>

      <div className="space-y-6">
        <section id="profile">
          <Card title="Profile & password">
            <p className="mt-2 text-slate-300">
              Signed in as <strong className="text-white">{user.email ?? "Authenticated user"}</strong>
            </p>
            <PasswordChangeForm required={requiresPasswordChange} />
          </Card>
        </section>

        <section id="appearance">
          <Card title="Appearance">
            <p className="mt-2 text-slate-300">
              Choose the interface palette that works best for your environment. Operational status colors keep the same meaning in every theme.
            </p>
            <div className="mt-5">
              <ThemeSelector placement="settings" />
            </div>
          </Card>
        </section>

        <section id="user-access">
          <Card title="User access">
            <p className="mt-2 text-slate-300">
              Create direct ParadeOne login accounts and assign organization-scoped permissions. There is no fixed limit on additional Admin, Staff, or Volunteer accounts.
            </p>

            {manageableOrganizations.length > 0 ? (
              <>
                <LocalUserAccountForm organizations={manageableOrganizations} />

                <div className="mt-8">
                  <h3 className="text-base font-semibold text-white">Permission levels</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {ORGANIZATION_ROLE_OPTIONS.map((role) => (
                      <div
                        key={role.id}
                        className="rounded-xl border border-slate-700 bg-slate-950/45 p-4"
                      >
                        <p className="font-semibold text-white">{role.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{role.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  <h3 className="text-base font-semibold text-white">Current organization accounts</h3>
                  {manageableOrganizations.map((organization) => {
                    const members = managedMembers.filter(
                      (member) => member.organization_id === organization.id
                    );

                    return (
                      <div
                        key={organization.id}
                        className="rounded-xl border border-slate-700 bg-slate-950/35 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{organization.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                              Your role: {organization.role}
                            </p>
                          </div>
                          <Link
                            href={`/organizations/${organization.slug}/settings`}
                            className="text-sm font-semibold text-blue-300 hover:text-blue-200"
                          >
                            Manage invitations
                          </Link>
                        </div>

                        {members.length > 0 ? (
                          <div className="mt-4 grid gap-2">
                            {members.map((member) => (
                              <div
                                key={member.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5"
                              >
                                <p className="text-sm text-slate-100">
                                  {member.member_email || "No email recorded"}
                                  {member.user_id === user.id ? (
                                    <span className="ml-2 text-xs text-slate-400">(you)</span>
                                  ) : null}
                                </p>
                                <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
                                  {getRoleLabel(member.role)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-slate-400">No accounts assigned.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/45 p-5">
                <p className="font-semibold text-white">No manageable organizations</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  You need an Owner or Admin role before you can create organization accounts. Staff and Volunteer users can still change their own appearance and password above.
                </p>
              </div>
            )}
          </Card>
        </section>

        <Card title="About ParadeOne">
          <p className="mt-2 text-slate-300">
            ParadeOne keeps account permissions scoped to each organization so users only see and operate the parades they are assigned to.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
