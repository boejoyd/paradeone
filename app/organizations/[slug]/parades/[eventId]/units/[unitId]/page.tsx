import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";

type UnitPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
    unitId: string;
  }>;
};

export default async function UnitPage({ params }: UnitPageProps) {
  const { slug, eventId, unitId } = await params;

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: slug, href: `/organizations/${slug}` },
          { label: eventId, href: `/organizations/${slug}/parades/${eventId}` },
          { label: `Unit ${unitId}` },
        ]}
      />

      <Card title="Parade Unit">
        <p className="mt-4 text-slate-400">
          This unit workspace is ready for the next operational milestone.
        </p>
      </Card>
    </AppShell>
  );
}
