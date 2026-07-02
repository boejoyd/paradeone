import Link from "next/link";
import { ActionBar } from "@/components/layout/ActionBar";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { deleteOrganization } from "./actions";

export default async function OrganizationsPage() {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

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
            <Link href="/create-parade">
              <Button>Create Parade</Button>
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
                </Link>

                <form action={deleteOrganization} className="mt-4">
                  <input
                    type="hidden"
                    name="organizationId"
                    value={organization.id}
                  />

                  <button
                    type="submit"
                    className="text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    Delete Organization
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No organizations yet"
            description="Create your first organization to begin managing parades, entries, staging, and operations."
            actionHref="/create-parade"
            actionLabel="Create Parade"
          />
        )}
      </Card>
    </AppShell>
  );
}
