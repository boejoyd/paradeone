import Link from "next/link";
import { ActionBar } from "@/components/layout/ActionBar";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OrganizationsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) throw new Error(membershipsError.message);

  const organizationIds = (memberships ?? [])
    .map((item) => item.organization_id)
    .filter((id): id is string => typeof id === "string");

  const { data: organizations, error } =
    organizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name, slug, description, created_at, archived_at")
          .in("id", organizationIds)
          .is("archived_at", null)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (error) throw new Error(error.message);

  return (
    <AppShell>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Organizations" }]}
      />

      <PageHeader
        eyebrow="Workspaces"
        title="Organizations"
        description="Manage the organizations that operate one or more parades."
        actions={
          <ActionBar>
            <Link href="/organizations/new">
              <Button>Create Organization</Button>
            </Link>
          </ActionBar>
        }
      />

      <Card title="Organizations">
        {organizations && organizations.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-5"
              >
                <Link
                  href={`/organizations/${organization.slug}`}
                  className="block transition hover:text-blue-300"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {organization.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    /{organization.slug}
                  </p>

                  {organization.description ? (
                    <p className="mt-3 text-sm text-slate-400">
                      {organization.description}
                    </p>
                  ) : null}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No organizations yet"
            description="Create your first organization to begin managing parades, entries, staging, and operations."
            actionHref="/organizations/new"
            actionLabel="Create Organization"
          />
        )}
      </Card>
    </AppShell>
  );
}
