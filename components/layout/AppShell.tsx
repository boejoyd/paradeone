import { signOut } from "@/app/login/actions";
import { MobileNav } from "@/components/navigation/MobileNav";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getCurrentUser } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MobileNav />

      <div className="flex min-h-screen w-full">
        <Sidebar />
        <section className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {user ? (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-200">Signed in</p>
                <p className="text-sm text-slate-400">
                  {user.email ?? "Authenticated user"}
                </p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
