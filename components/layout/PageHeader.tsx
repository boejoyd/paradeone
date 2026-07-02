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
    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow && (
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-4 text-5xl font-bold tracking-tight">
          {title}
        </h2>

        {description && (
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
