"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "@/app/login/actions";

const navItems = [
  { label: "Mission Control", href: "/" },
  { label: "Organizations", href: "/organizations" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

type MobileNavProps = {
  userEmail?: string | null;
};

function getCommandContext(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "Mission Control";
  }

  if (segments[0] === "organizations") {
    const slug = segments[1];
    const paradeIndex = segments.indexOf("parades");
    const paradeId = paradeIndex >= 0 ? segments[paradeIndex + 1] : null;

    if (slug && paradeId) {
      return `${slug} / Parade ${paradeId}`;
    }

    if (slug) {
      return slug;
    }
  }

  return segments
    .map((part) => part.replace(/[-_]/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

export function MobileNav({ userEmail }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const commandContext = useMemo(() => getCommandContext(pathname), [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      setUserMenuOpen(false);
    }
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex h-10 items-center justify-between gap-2 px-2 sm:px-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-700 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
              aria-label={open ? "Close navigation drawer" : "Open navigation drawer"}
              aria-expanded={open}
            >
              ☰
            </button>

            <p className="truncate text-xs font-semibold tracking-wide text-slate-200">{commandContext}</p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="inline-flex h-7 items-center rounded border border-slate-700 px-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
              aria-expanded={userMenuOpen}
              aria-label="Toggle user menu"
            >
              {userEmail ?? "User"}
            </button>

            {userMenuOpen ? (
              <div className="absolute right-0 top-9 w-52 rounded-md border border-slate-700 bg-slate-900 p-2 shadow-xl">
                <p className="truncate px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">User Menu</p>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="mt-1 w-full rounded px-2 py-1.5 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {open ? <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      <aside
        className={[
          "fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-800 bg-slate-950 p-4 shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-white">PARADEONE</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            aria-label="Close navigation drawer"
          >
            Close
          </button>
        </div>

        <nav className="grid gap-2">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
