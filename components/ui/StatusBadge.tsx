type StatusBadgeProps = {
  status: string | null | undefined;
};

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status || "unknown";

  const styles: Record<string, string> = {
    ready: "border-green-700 bg-green-600 text-white",
    moving: "border-emerald-700 bg-emerald-600 text-white animate-pulse",
    pushed_off: "border-emerald-700 bg-emerald-600 text-white animate-pulse",
    approaching_start: "border-cyan-700 bg-cyan-600 text-white animate-pulse",
    on_route: "border-blue-700 bg-blue-600 text-white animate-pulse",
    approaching_finish: "border-violet-700 bg-violet-600 text-white animate-pulse",
    staged: "border-yellow-500 bg-yellow-400 text-slate-950",
    getting_ready: "border-yellow-400 bg-yellow-300 text-slate-950",
    needs_assistance: "border-red-700 bg-red-600 text-white",
    checked_in: "border-green-700 bg-green-600 text-white",
    completed: "border-slate-700 bg-slate-800 text-white",
    not_checked_in: "border-slate-600 bg-slate-600 text-white",
    draft: "border-slate-600 bg-slate-600 text-white",
    registration_open: "border-yellow-400 bg-yellow-300 text-slate-950",
    registration_closed: "border-orange-700 bg-orange-600 text-white",
    lineup_building: "border-blue-700 bg-blue-600 text-white",
    lineup_locked: "border-indigo-700 bg-indigo-600 text-white",
    check_in_open: "border-green-700 bg-green-600 text-white",
    parade_active: "border-red-700 bg-red-600 text-white",
    archived: "border-slate-700 bg-slate-800 text-white",
    approved: "border-green-700 bg-green-600 text-white",
    rejected: "border-red-700 bg-red-600 text-white",
    assigned: "border-blue-700 bg-blue-600 text-white",
    submitted: "border-yellow-400 bg-yellow-300 text-slate-950",
    needs_review: "border-orange-700 bg-orange-600 text-white",
    empty: "border-slate-600 bg-slate-600 text-white",
    unknown: "border-slate-600 bg-slate-600 text-white",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        styles[normalized] || styles.unknown,
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}
