import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <AppShell>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Settings" }]}
      />

      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Settings</p>
        <h2 className="mt-4 text-5xl font-bold tracking-tight">Account Settings</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <p className="mt-2 text-slate-400">
            Profile settings placeholder. Personal details and account preferences
            will appear here.
          </p>
        </Card>

        <Card title="Appearance">
          <p className="mt-2 text-slate-400">
            Appearance settings placeholder. Theme and interface display controls
            will appear here.
          </p>
        </Card>

        <Card title="Notifications">
          <p className="mt-2 text-slate-400">
            Notification settings placeholder. Alert preferences and delivery
            channels will appear here.
          </p>
        </Card>

        <Card title="About ParadeOne">
          <p className="mt-2 text-slate-400">
            About section placeholder. Product version, support links, and
            release notes will appear here.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
