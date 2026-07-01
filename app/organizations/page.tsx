import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { deleteOrganization } from "./actions";

export default async function OrganizationsPage() {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Organizations" }]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Workspaces
          </p>

          <h2 className="mt-4 text-5xl font-bold tracking-tight">
            Organizations
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Manage the organizations that operate one or more parades.
          </p>
        </div>

        <Link href="/create-parade">
          <Button>Create Parade</Button>
        </Link>
      </div>

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
          <p className="mt-6 text-slate-400">No organizations exist yet.</p>
        )}
      </Card>
    </AppShell>
  );
}
