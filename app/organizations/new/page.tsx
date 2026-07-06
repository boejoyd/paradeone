import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";

export default function NewOrganizationPage() {
  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Organizations", href: "/organizations" },
          { label: "New" },
        ]}
      />

      <Card title="Create Organization">
        <p className="mt-2 text-slate-400">
          Organization creation form placeholder.
        </p>
      </Card>
    </AppShell>
  );
}
