import { ReactNode } from "react";

type ActionBarProps = {
  children: ReactNode;
};

export function ActionBar({ children }: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
    </div>
  );
}
