"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";

const navItems = [
  { label: "Parade Setup", href: "/organizations" },
  { label: "Settings", href: "/settings" },
];

type SidebarProps = {
  userEmail?: string | null;
};

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        "hidden min-h-screen shrink-0 border-r border-slate-700 bg-slate-900 px-3 py-6 transition-all duration-200 md:flex md:flex-col",
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
          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-700"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

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
                  : "text-slate-200 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              {collapsed ? item.label.charAt(0) : item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-700 pt-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed In</p>
          <p className="mt-1 truncate text-sm text-slate-200">
            {collapsed ? "User" : userEmail ?? "Authenticated user"}
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-700"
          >
            {collapsed ? "Out" : "Sign Out"}
          </button>
        </form>
      </div>
    </aside>
  );
}
