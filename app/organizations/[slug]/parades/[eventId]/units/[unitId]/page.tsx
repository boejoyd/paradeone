import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";

type ParadeUnitDetailPageProps = {
  params: Promise<{
    slug: string;
    eventId: string;
    unitId: string;
  }>;
};

export default async function ParadeUnitDetailPage({
  params,
}: ParadeUnitDetailPageProps) {
  const { slug, eventId, unitId } = await params;

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: slug, href: `/organizations/${slug}` },
          { label: eventId, href: `/organizations/${slug}/parades/${eventId}` },
          { label: "Units", href: `/organizations/${slug}/parades/${eventId}/units` },
          { label: unitId },
        ]}
      />

      <Card title="Parade Unit">
        <p className="mt-2 text-slate-400">Parade unit detail placeholder.</p>
      </Card>
    </AppShell>
  );
}
