import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

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

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Organization
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          {organization.name}
        </h2>
        <p className="mt-4 text-lg text-slate-300">/{organization.slug}</p>
      </div>

      <Card title="Parades">
        {events && events.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <h3 className="text-lg font-semibold text-white">
                  {event.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {event.city || "No city set"} •{" "}
                  {event.event_date || "No date set"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {event.status}
                </p>
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
