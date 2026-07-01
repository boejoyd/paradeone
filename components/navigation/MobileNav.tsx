"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Mission Control", href: "/" },
  { label: "Organizations", href: "/organizations" },
  { label: "Create Parade", href: "/create-parade" },
  { label: "Entries", href: "/entries" },
  { label: "Staging", href: "/staging" },
  { label: "Sections", href: "/sections" },
  { label: "Messages", href: "/messages" },
  { label: "Live Map", href: "/live-map" },
  { label: "Announcer", href: "/announcer" },
  { label: "Judges", href: "/judges" },
  { label: "Reports", href: "/reports" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-800 bg-slate-950 px-5 py-4 md:hidden">
      <div className="flex items-center justify-between">
        <Link href="/" className="block">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-white">
            PARADEONE
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Mission Control
          </p>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
        >
          Menu
        </button>
      </div>

      {open && (
        <nav className="mt-4 grid gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
