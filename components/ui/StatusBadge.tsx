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
    ready: "border-green-800 bg-green-950 text-green-300",
    getting_ready: "border-yellow-800 bg-yellow-950 text-yellow-300",
    needs_assistance: "border-red-700 bg-red-950 text-red-300",
    checked_in: "border-green-800 bg-green-950 text-green-300",
    not_checked_in: "border-slate-700 bg-slate-900 text-slate-300",
    draft: "border-slate-700 bg-slate-900 text-slate-300",
    registration_open: "border-yellow-800 bg-yellow-950 text-yellow-300",
    registration_closed: "border-orange-800 bg-orange-950 text-orange-300",
    lineup_building: "border-blue-800 bg-blue-950 text-blue-300",
    lineup_locked: "border-purple-800 bg-purple-950 text-purple-300",
    check_in_open: "border-green-800 bg-green-950 text-green-300",
    parade_active: "border-red-800 bg-red-950 text-red-300",
    archived: "border-slate-700 bg-slate-900 text-slate-400",
    approved: "border-green-800 bg-green-950 text-green-300",
    rejected: "border-red-800 bg-red-950 text-red-300",
    assigned: "border-blue-800 bg-blue-950 text-blue-300",
    submitted: "border-yellow-800 bg-yellow-950 text-yellow-300",
    needs_review: "border-orange-800 bg-orange-950 text-orange-300",
    empty: "border-slate-700 bg-slate-900 text-slate-300",
    unknown: "border-slate-700 bg-slate-900 text-slate-300",
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
