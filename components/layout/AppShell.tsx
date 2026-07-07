import { MobileNav } from "@/components/navigation/MobileNav";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getCurrentUser } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const userEmail = user?.email ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MobileNav />

      <div className="flex min-h-screen w-full">
        <Sidebar userEmail={userEmail} />
        <section className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </section>
      </div>
    </main>
  );
}
