type StatCardProps = {
  label: string;
  value: string | number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
    </div>
  );
}
