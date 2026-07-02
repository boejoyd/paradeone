import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}

      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-slate-400">{description}</p>

      {actionHref && actionLabel && (
        <div className="mt-6">
          <Link href={actionHref}>
            <Button>{actionLabel}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
