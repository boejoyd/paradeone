import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { requireOrganizationRole } from "@/lib/auth";
import { requireAccessibleOrganizationBySlug } from "@/lib/organizations/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addOrganizationMemberOrInvite } from "./actions";
import { OrganizationDangerZoneForm } from "./OrganizationDangerZoneForm";

type OrganizationSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { slug } = await params;

  const organization = await requireAccessibleOrganizationBySlug(slug);
  const supabase = await createServerSupabaseClient();

  await requireOrganizationRole(organization.id, ["owner", "admin"]);

  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("id, member_email, role, created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const { data: invites, error: invitesError } = await supabase
    .from("organization_invites")
    .select("id, email, role, status, created_at")
    .eq("organization_id", organization.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (invitesError) {
    throw new Error(invitesError.message);
  }

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          { label: organization.name, href: `/organizations/${organization.slug}` },
          { label: "Settings" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Setup Settings
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="space-y-6">
        <Card title="Access">
          <p className="mt-2 text-slate-400">
            Owners and admins can add existing users immediately or create pending invitations for emails that have not signed up yet.
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
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="volunteer">Volunteer</option>
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

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Members</h3>
              {members && members.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-sm font-medium text-white">{member.member_email || "No email recorded"}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{member.role}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No members yet.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Pending Invites</h3>
              {invites && invites.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-sm font-medium text-white">{invite.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{invite.role} • pending</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No pending invites.</p>
              )}
            </div>
          </div>
        </Card>

        <Card title="General">
          <p className="mt-2 text-slate-400">
            Manage organization-level settings and operational defaults.
          </p>
          <div className="mt-4">
            <Link
              href={`/organizations/${organization.slug}/edit`}
              className="text-sm font-medium text-blue-300 hover:text-blue-200"
            >
              Edit organization details
            </Link>
          </div>
        </Card>

        <OrganizationDangerZoneForm
          organizationId={organization.id}
          organizationSlug={organization.slug}
          organizationName={organization.name}
        />
      </div>
    </AppShell>
  );
}
