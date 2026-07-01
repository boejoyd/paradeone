"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="border-b border-slate-800 bg-slate-950 px-5 py-4">
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
            {open ? "Close" : "☰ Menu"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 px-5 py-5 backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" onClick={() => setOpen(false)}>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-white">
                PARADEONE
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                Mission Control
              </p>
            </Link>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Close
            </button>
          </div>

          <nav className="grid gap-2">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "rounded-xl px-4 py-4 text-base font-medium transition",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
