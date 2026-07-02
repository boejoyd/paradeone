import { MobileNav } from "@/components/navigation/MobileNav";
import { Sidebar } from "@/components/navigation/Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MobileNav />

<div className="flex min-h-screen w-full">
        <Sidebar />
        <section className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </section>
      </div>
    </main>
  );
}
