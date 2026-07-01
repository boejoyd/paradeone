import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { deleteOrganization, deleteParade } from "@/app/organizations/actions";
import { DeleteButton } from "@/components/ui/DeleteButton";

type OrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const { slug } = await params;

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

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
        </div>

        <Link href="/create-parade">
          <Button>Create Parade</Button>
        </Link>
      </div>

	<form action={deleteOrganization} className="mb-8">
  		<input type="hidden" name="organizationId" value={organization.id} />
<DeleteButton
  label="Delete Organization"
  confirmMessage={`Delete ${organization.name}? This will permanently delete the organization, all parades, entries, staging spots, and check-ins.`}
/>
	</form>

      <Card title="Parades">
        {events && events.length > 0 ? (
          <div className="mt-4 grid gap-3">


{events.map((event) => (
  <div
    key={event.id}
    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{event.name}</h3>

        <p className="mt-1 text-sm text-slate-400">
          {event.city || "No city set"} • {event.event_date || "No date set"}
        </p>

        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
          {event.status}
        </p>
      </div>

      <div className="flex gap-2">
        <Link href={`/organizations/${organization.slug}/parades/${event.id}`}>
          <Button variant="secondary">Open</Button>
        </Link>

        <form action={deleteParade}>
          <input
            type="hidden"
            name="organizationSlug"
            value={organization.slug}
          />
          <input type="hidden" name="eventId" value={event.id} />
<DeleteButton
  label="Delete"
  confirmMessage={`Delete ${event.name}? This will permanently delete this parade, its entries, staging spots, and check-ins.`}
/>
        </form>
      </div>
    </div>
  </div>
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
