import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Workspaces
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">
            Organizations
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Manage parade organizations and the events they operate.
          </p>
        </div>

        <Link href="/create-parade">
          <Button>Create Parade</Button>
        </Link>
      </div>

      <Card title="Your Organizations">
        {organizations && organizations.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <h3 className="text-lg font-semibold text-white">
                  {organization.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  /{organization.slug}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-400">
            No organizations yet. Create a parade to create your first
            organization.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
