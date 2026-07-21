type StatCardProps = {
  label: string;
  value: string | number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg shadow-slate-950/15">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
    </div>
  );
}
