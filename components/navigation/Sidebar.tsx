"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export function Sidebar() {
  const pathname = usePathname();
  const [activeParade, setActiveParade] = useState<ActiveParade | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_PARADE_KEY);

    if (stored) {
      setActiveParade(JSON.parse(stored));
    }
  }, []);

  return (
    <aside className="hidden min-h-screen w-56 shrink-0 border-r border-slate-800 bg-slate-950 px-4 py-6 md:block">
      <Link href="/" className="block transition hover:opacity-80">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-white">
          PARADEONE
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-300">
          Operations
        </h1>
      </Link>

      {activeParade && (
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

      <nav className="mt-10 space-y-2">
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
                "block rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
