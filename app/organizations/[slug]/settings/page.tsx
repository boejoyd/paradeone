import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { requireOrganizationAccess, requireUser, type OrganizationRole } from "@/lib/auth";
import { requireAccessibleOrganizationBySlug } from "@/lib/organizations/access";
import {
  canManageOrganizationMember,
  canManageOrganizationUsers,
  getAssignableOrganizationRoles,
  isOrganizationRole,
  ORGANIZATION_ROLE_OPTIONS,
} from "@/lib/organizations/permissions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  addOrganizationMemberOrInvite,
  cancelOrganizationInvite,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "./actions";
import { OrganizationDangerZoneForm } from "./OrganizationDangerZoneForm";

type OrganizationSettingsPageProps = {
  params: Promise<{ slug: string }>;
};

function roleLabel(role: string) {
  return ORGANIZATION_ROLE_OPTIONS.find((option) => option.id === role)?.label ?? role;
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { slug } = await params;
  const user = await requireUser();
  const organization = await requireAccessibleOrganizationBySlug(slug);
  const access = await requireOrganizationAccess(organization.id);

  if (!canManageOrganizationUsers(access.role)) {
    redirect(`/organizations/${organization.slug}`);
  }

  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    throw new Error("Team management is not configured on this deployment.");
  }

  const assignableRoles = getAssignableOrganizationRoles(access.role);
  const [membersResult, invitesResult] = await Promise.all([
    adminSupabase
      .from("organization_members")
      .select("id, user_id, member_email, role, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("organization_invites")
      .select("id, email, role, status, created_at")
      .eq("organization_id", organization.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (membersResult.error) throw new Error(membersResult.error.message);
  if (invitesResult.error) throw new Error(invitesResult.error.message);

  const members = membersResult.data ?? [];
  const invites = invitesResult.data ?? [];

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          { label: organization.name, href: `/organizations/${organization.slug}` },
          { label: "Team & Permissions" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Organization Administration
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Team & Permissions</h2>
        <p className="mt-3 max-w-3xl text-slate-400">
          Invite organizers, assign the access they need, and remove access when a person is no longer working with this organization.
        </p>
      </div>

      <div className="space-y-6">
        <Card title="Invite a team member">
          <p className="mt-2 text-slate-400">
            Existing ParadeOne users are added immediately. New users receive a pending invitation until they create an account.
          </p>

          <form action={addOrganizationMemberOrInvite} className="mt-5 grid gap-4">
            <input type="hidden" name="organizationId" value={organization.id} />
            <input type="hidden" name="organizationSlug" value={organization.slug} />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  placeholder="member@example.com"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Role</span>
                <select
                  name="role"
                  defaultValue="staff"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                >
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex rounded-xl border border-blue-400 bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                >
                  Add or Invite
                </button>
              </div>
            </div>
          </form>
        </Card>

        <Card title={`Team members (${members.length})`}>
          <div className="mt-4 space-y-3">
            {members.length > 0 ? members.map((member) => {
              const memberRole: OrganizationRole = isOrganizationRole(member.role)
                ? member.role
                : "volunteer";
              const canManage = canManageOrganizationMember(access.role, memberRole);
              const isCurrentUser = member.user_id === user.id;

              return (
                <div
                  key={member.id}
                  className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">
                        {member.member_email || "No email recorded"}
                      </p>
                      {isCurrentUser ? (
                        <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-200">You</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{roleLabel(memberRole)}</p>
                  </div>

                  {canManage ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={updateOrganizationMemberRole} className="flex items-end gap-2">
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="organizationSlug" value={organization.slug} />
                        <input type="hidden" name="membershipId" value={member.id} />
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-slate-400">Role</span>
                          <select
                            name="role"
                            defaultValue={memberRole}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                          >
                            {assignableRoles.map((role) => (
                              <option key={role.id} value={role.id}>{role.label}</option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white">
                          Save
                        </button>
                      </form>
                      <form action={removeOrganizationMember}>
                        <input type="hidden" name="organizationId" value={organization.id} />
                        <input type="hidden" name="organizationSlug" value={organization.slug} />
                        <input type="hidden" name="membershipId" value={member.id} />
                        <button type="submit" className="rounded-lg border border-red-500/60 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10">
                          Remove
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Owner access cannot be changed by an admin.</p>
                  )}
                </div>
              );
            }) : <p className="text-sm text-slate-400">No members yet.</p>}
          </div>
        </Card>

        <Card title={`Pending invitations (${invites.length})`}>
          <div className="mt-4 space-y-3">
            {invites.length > 0 ? invites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div>
                  <p className="font-medium text-white">{invite.email}</p>
                  <p className="mt-1 text-sm text-slate-400">{roleLabel(invite.role)} · Pending</p>
                </div>
                <form action={cancelOrganizationInvite}>
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="organizationSlug" value={organization.slug} />
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200">
                    Cancel invite
                  </button>
                </form>
              </div>
            )) : <p className="text-sm text-slate-400">No pending invitations.</p>}
          </div>
        </Card>

        <Card title="Role guide">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ORGANIZATION_ROLE_OPTIONS.map((role) => (
              <div key={role.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <h3 className="font-semibold text-white">{role.label}</h3>
                <p className="mt-2 text-sm text-slate-400">{role.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="General">
          <p className="mt-2 text-slate-400">Manage organization-level settings and operational defaults.</p>
          <div className="mt-4">
            <Link href={`/organizations/${organization.slug}/edit`} className="text-sm font-medium text-blue-300 hover:text-blue-200">
              Edit organization details
            </Link>
          </div>
        </Card>

        {access.role === "owner" ? (
          <OrganizationDangerZoneForm
            organizationId={organization.id}
            organizationSlug={organization.slug}
            organizationName={organization.name}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
