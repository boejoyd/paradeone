type CardProps = {
  title: string;
  children: React.ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-2 text-slate-400">{children}</div>
    </div>
  );
}
