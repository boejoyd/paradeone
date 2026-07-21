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
    ready: "border-[#15803d] bg-[#16a34a] text-white",
    moving: "border-[#047857] bg-[#059669] text-white animate-pulse",
    pushed_off: "border-[#047857] bg-[#059669] text-white animate-pulse",
    approaching_start: "border-[#0e7490] bg-[#0891b2] text-white animate-pulse",
    on_route: "border-[#1d4ed8] bg-[#2563eb] text-white animate-pulse",
    approaching_finish: "border-[#6d28d9] bg-[#7c3aed] text-white animate-pulse",
    staged: "border-[#eab308] bg-[#facc15] text-[#020617]",
    getting_ready: "border-[#facc15] bg-[#fde047] text-[#020617]",
    needs_assistance: "border-[#b91c1c] bg-[#dc2626] text-white",
    checked_in: "border-[#15803d] bg-[#16a34a] text-white",
    completed: "border-[#334155] bg-[#1e293b] text-white",
    not_checked_in: "border-[#475569] bg-[#475569] text-white",
    draft: "border-[#475569] bg-[#475569] text-white",
    registration_open: "border-[#facc15] bg-[#fde047] text-[#020617]",
    registration_closed: "border-[#c2410c] bg-[#ea580c] text-white",
    lineup_building: "border-[#1d4ed8] bg-[#2563eb] text-white",
    lineup_locked: "border-[#4338ca] bg-[#4f46e5] text-white",
    check_in_open: "border-[#15803d] bg-[#16a34a] text-white",
    parade_active: "border-[#b91c1c] bg-[#dc2626] text-white",
    archived: "border-[#334155] bg-[#1e293b] text-white",
    approved: "border-[#15803d] bg-[#16a34a] text-white",
    rejected: "border-[#b91c1c] bg-[#dc2626] text-white",
    assigned: "border-[#1d4ed8] bg-[#2563eb] text-white",
    submitted: "border-[#eab308] bg-[#facc15] text-[#020617]",
    needs_review: "border-[#c2410c] bg-[#ea580c] text-white",
    empty: "border-[#475569] bg-[#475569] text-white",
    unknown: "border-[#475569] bg-[#475569] text-white",
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
