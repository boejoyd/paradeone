"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/login/actions";
import { ACTIVE_PARADE_KEY } from "@/lib/activeParade";

type ActiveParade = {
  organizationName: string;
  organizationSlug: string;
  paradeId: string;
  paradeName: string;
};

const navItems = [
  { label: "Organizations", href: "/organizations" },
  { label: "Parades", href: "/parades" },
  { label: "Mission Control", href: "/" },
  { label: "Settings", href: "/settings" },
];

type SidebarProps = {
  userEmail?: string | null;
};

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [activeParade, setActiveParade] = useState<ActiveParade | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_PARADE_KEY);

    if (stored) {
      setActiveParade(JSON.parse(stored));
    }
  }, []);

  return (
    <aside
      className={[
        "hidden min-h-screen shrink-0 border-r border-slate-800 bg-slate-950 px-3 py-6 transition-all duration-200 md:flex md:flex-col",
        collapsed ? "w-24" : "w-64",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href="/" className="block transition hover:opacity-80">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-white">
            {collapsed ? "P1" : "PARADEONE"}
          </p>
          {!collapsed ? (
            <h1 className="mt-3 text-xl font-semibold text-slate-300">
              Mission Control
            </h1>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      {activeParade && !collapsed && (
        <Link
          href={`/organizations/${activeParade.organizationSlug}/parades/${activeParade.paradeId}`}
          className="mt-6 block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-blue-500"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Active Parade
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {activeParade.paradeName}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeParade.organizationName}
          </p>
        </Link>
      )}

      <nav className="mt-8 space-y-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-xl px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white",
              ].join(" ")}
            >
              {collapsed ? item.label.charAt(0) : item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-800 pt-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signed In</p>
          <p className="mt-1 truncate text-sm text-slate-200">
            {collapsed ? "User" : userEmail ?? "Authenticated user"}
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            {collapsed ? "Out" : "Sign Out"}
          </button>
        </form>
      </div>
    </aside>
  );
}
