import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireOrganizationAccess } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { archiveOrganization } from "./edit/actions";

type OrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug, description, created_at, archived_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!organization) notFound();

  const access = await requireOrganizationAccess(organization.id);
  const isOwner = access.role === "owner";

  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_date, city, status")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: organization.name },
        ]}
      />

      <div className="mb-10 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Organization
          </p>
          <h2 className="mt-4 text-5xl font-bold tracking-tight">
            {organization.name}
          </h2>
          <p className="mt-4 text-lg text-slate-300">/{organization.slug}</p>
          {organization.description ? (
            <p className="mt-4 max-w-2xl text-slate-300">
              {organization.description}
            </p>
          ) : null}
          {organization.archived_at ? (
            <p className="mt-4 text-sm font-medium text-amber-400">
              This organization is archived.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {isOwner ? (
            <Link href={`/organizations/${organization.slug}/edit`}>
              <Button variant="secondary">Edit Organization</Button>
            </Link>
          ) : null}

          {isOwner && !organization.archived_at ? (
            <form action={archiveOrganization}>
              <input type="hidden" name="organizationId" value={organization.id} />
              <Button type="submit" variant="secondary">
                Archive Organization
              </Button>
            </form>
          ) : null}

          <Link href="/create-parade">
            <Button>Create Parade</Button>
          </Link>
        </div>
      </div>

      <Card title="Parades">
        {events && events.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/organizations/${organization.slug}/parades/${event.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-blue-500 hover:bg-slate-900"
              >
                <h3 className="text-lg font-semibold text-white">
                  {event.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {event.city || "No city set"} • {event.event_date || "No date set"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {event.status}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-400">
            No parades for this organization yet.
          </p>
        )}
      </Card>
    </AppShell>
  );
}
