import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAccessibleOrganizationBySlug } from "@/lib/organizations/access";
import { updateOrganization } from "./actions";

type EditOrganizationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditOrganizationPage({
  params,
}: EditOrganizationPageProps) {
  const { slug } = await params;

  const organization = await requireAccessibleOrganizationBySlug(slug);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Parade Setup", href: "/organizations" },
          { label: organization.name, href: `/organizations/${organization.slug}` },
          { label: "Edit" },
        ]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Parade Setup Settings
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          Edit Parade Setup
        </h2>
        <div className="mt-4">
          <a
            href={`/organizations/${organization.slug}/settings`}
            className="text-sm font-medium text-blue-300 hover:text-blue-200"
          >
            Open Parade Setup Settings & Danger Zone
          </a>
        </div>
      </div>

      <Card title="Parade Setup Details">
        <form action={updateOrganization} className="mt-6 grid gap-5">
          <input type="hidden" name="organizationId" value={organization.id} />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Parade Setup Name
            </span>
            <input
              name="name"
              required
              defaultValue={organization.name}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <div className="pt-4">
            <Button>Save Changes</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
