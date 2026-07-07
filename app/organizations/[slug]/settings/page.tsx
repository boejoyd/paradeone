import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
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

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: organization.name, href: `/organizations/${organization.slug}` },
          { label: "Settings" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Organization Settings
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="space-y-6">
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
