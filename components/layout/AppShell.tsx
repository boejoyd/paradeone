import { MobileNav } from "@/components/navigation/MobileNav";
import { getCurrentUser } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const userEmail = user?.email ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MobileNav userEmail={userEmail} />

      <div className="w-full">
        <section className="px-3 py-2 sm:px-4 md:px-5 md:py-3">{children}</section>
      </div>
    </main>
  );
}
