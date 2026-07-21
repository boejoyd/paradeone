import Image from "next/image";

type Props = {
  searchParams: Promise<{ reference?: string | string[] }>;
};

export default async function RegistrationThankYouPage({ searchParams }: Props) {
  const values = await searchParams;
  const reference = typeof values.reference === "string" ? values.reference : null;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-emerald-700 bg-slate-900 p-8 text-center shadow-xl">
        <Image src="/paradeone-mark.png" alt="ParadeOne" width={72} height={72} className="mx-auto rounded-xl bg-white" priority />
        <h1 className="mt-6 text-3xl font-bold">Registration submitted</h1>
        <p className="mt-4 leading-7 text-slate-300">The parade organizer will review your application. Submission does not guarantee approval or a lineup position.</p>
        {reference ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Confirmation reference</p>
            <p className="mt-2 select-all font-mono text-xl font-bold text-white">{reference}</p>
          </div>
        ) : null}
        <p className="mt-6 text-sm text-slate-400">You may close this page.</p>
      </section>
    </main>
  );
}
