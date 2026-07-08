import Link from "next/link";
import { ActionBar } from "@/components/layout/ActionBar";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listAccessibleOrganizations } from "@/lib/organizations/access";

export default async function OrganizationsPage() {
  const organizations = await listAccessibleOrganizations();

  return (
    <AppShell>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Parade Setup" }]}
      />

      <PageHeader
        eyebrow="Workspaces"
        title="Parade Setup"
        description="Manage the parade setups that operate one or more parades."
        actions={
          <ActionBar>
            <Link href="/create-parade">
              <Button>Create Parade</Button>
            </Link>
          </ActionBar>
        }
      />

      <Card title="Parade Setup">
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
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No parade setups yet"
            description="Create your first parade setup to begin managing parades, entries, staging, and operations."
            actionHref="/create-parade"
            actionLabel="Create Parade"
          />
        )}
      </Card>
    </AppShell>
  );
}
