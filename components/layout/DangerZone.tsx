import { ReactNode } from "react";

type DangerZoneProps = {
  title?: string;
  description: string;
  children: ReactNode;
};

export function DangerZone({
  title = "Danger Zone",
  description,
  children,
}: DangerZoneProps) {
  return (
    <div className="rounded-2xl border border-red-900 bg-red-950/40 p-6">
      <h3 className="text-lg font-semibold text-red-200">{title}</h3>
      <p className="mt-2 text-sm text-red-200/80">{description}</p>

      <div className="mt-5">{children}</div>
    </div>
  );
}
