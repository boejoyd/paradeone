type StatusBadgeProps = {
  status: string | null | undefined;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status || "unknown";

  const styles =
    value === "checked_in"
      ? "border-green-500/40 bg-green-500/10 text-green-300"
      : value === "not_checked_in"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : value === "draft"
          ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
