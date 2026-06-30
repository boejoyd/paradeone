import { Sidebar } from "@/components/navigation/Sidebar";
import Link from "next/link";

<Link
  href="/"
  className="block transition-opacity hover:opacity-80"
>
  <div>
    <h1>ParadeOne</h1>
    <p>Mission Control</p>
  </div>
</Link>

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <Sidebar />
        <section className="flex-1 px-8 py-8">{children}</section>
      </div>
    </main>
  );
}
