import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  version: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  version,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-900 px-4 py-8 text-slate-100 print:bg-white print:px-0 print:py-0 print:text-black sm:px-6 lg:px-8">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-slate-800/95 p-6 shadow-2xl shadow-slate-950/20 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-8">
        <header className="border-b border-slate-700/80 pb-5 print:border-black">
          <h1 className="text-3xl font-semibold tracking-tight print:text-black sm:text-4xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300 print:text-black">
            <p>
              <span className="font-semibold">Version:</span> {version}
            </p>
            <p>
              <span className="font-semibold">Last Updated:</span> {lastUpdated}
            </p>
          </div>
        </header>

        <div className="mt-6 space-y-6 text-sm leading-6 text-slate-200 print:text-black sm:text-base">
          {children}
        </div>
      </article>
    </main>
  );
}
