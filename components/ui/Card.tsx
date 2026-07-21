type CardProps = {
  title: string;
  children: React.ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg shadow-slate-950/15">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-2 text-slate-300">{children}</div>
    </div>
  );
}
