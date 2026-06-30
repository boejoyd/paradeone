import Link from "next/link";

const navItems = [
  { label: "Organizations", href: "/organizations" },
  { label: "Create Parade", href: "/create-parade" },
  { label: "Mission Control", href: "/" },
  { label: "Entries", href: "/entries" },
  { label: "Staging", href: "/staging" },
  { label: "Sections", href: "/sections" },
  { label: "Messages", href: "/messages" },
  { label: "Live Map", href: "/live-map" },
  { label: "Announcer", href: "/announcer" },
  { label: "Judges", href: "/judges" },
  { label: "Reports", href: "/reports" },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-slate-800 px-6 py-8 md:block">
      <Link href="/" className="block transition hover:opacity-80">
        <p className="text-sm font-black uppercase tracking-[0.4em] text-white">
          ParadeOne
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-300">
          Mission Control
        </h1>
      </Link>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
