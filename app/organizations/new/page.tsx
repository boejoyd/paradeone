import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createOrganization } from "../actions";

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

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Create Organization
        </p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          New Organization
        </h2>
      </div>

      <Card title="Organization Details">
        <form action={createOrganization} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Organization Name
            </span>
            <input
              name="name"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              placeholder="Example: Pride San Antonio"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Slug</span>
            <input
              name="slug"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              placeholder="pride-san-antonio"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              placeholder="What does this organization do?"
            />
          </label>

          <div className="pt-4">
            <Button>Create Organization</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
