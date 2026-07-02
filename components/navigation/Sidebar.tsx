"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Organizations", href: "/organizations" },
  { label: "Parades", href: "/parades" },
  { label: "Mission Control", href: "/" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

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
