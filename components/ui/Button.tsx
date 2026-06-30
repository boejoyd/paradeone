type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({ children, variant = "primary", ...props }: ButtonProps) {
  const base =
    "rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60";

  const styles =
    variant === "primary"
      ? "bg-blue-500 text-white hover:bg-blue-400"
      : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800";

  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}
