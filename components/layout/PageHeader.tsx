import { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-100">{title}</h2>

        {description && (
          <p className="mt-1 max-w-3xl text-xs text-slate-300">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
