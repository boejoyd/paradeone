const navItems = [
  "Create Parade",
  "Mission Control",
  "Entries",
  "Staging",
  "Sections",
  "Messages",
  "Live Map",
  "Announcer",
  "Judges",
  "Reports",
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-slate-800 px-6 py-8 md:block">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
          ParadeOne
        </p>
        <h1 className="mt-3 text-2xl font-bold">Mission Control</h1>
      </div>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => (
          <button
            key={item}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}
