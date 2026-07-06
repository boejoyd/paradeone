import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  const displayName = user?.email ?? "there";

  return (
    <AppShell>
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          ParadeOne
        </p>
        <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Mission Control
        </h2>
        <p className="max-w-2xl text-lg text-slate-300">
          Welcome back, {displayName}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card title="Live Map">
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-400">
              <p className="font-medium text-slate-200">GPS parade unit locations</p>
              <p className="mt-2">Green = checked in / ready</p>
              <p className="mt-1">Red = missing / not checked in</p>
            </div>
          </Card>

          <Card title="Lineup">
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-400">
              <p className="font-medium text-slate-200">Float / unit order</p>
              <p className="mt-2">Float information and staging location will appear here.</p>
              <p className="mt-1">Check-in status will be shown once the workflow is connected.</p>
            </div>
          </Card>

          <Card title="Communications">
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-400">
              <p className="font-medium text-slate-200">Text-message links and participant replies</p>
              <p className="mt-2">Participant replies and chat will appear inside Mission Control once messaging is enabled.</p>
            </div>
          </Card>

          <Card title="Organizations">
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-sm text-slate-400">
              Organization membership views will appear here in a future update.
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Quick Actions">
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/organizations">
                <Button className="w-full justify-center">Create Organization</Button>
              </Link>
              <Link href="/organizations">
                <Button variant="secondary" className="w-full justify-center">
                  Organizations
                </Button>
              </Link>
              <Link href="/camp-nackte/waiver/submissions">
                <Button variant="secondary" className="w-full justify-center">
                  Camp Nackte Waivers
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
