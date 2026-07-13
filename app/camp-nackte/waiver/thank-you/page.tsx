import Link from "next/link";

export default async function CampNackteThankYouPage({ searchParams }: { searchParams: Promise<{ confirmation?: string; expiresAt?: string; pdf?: string }> }) {
  const { confirmation, expiresAt, pdf } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-white md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Camp Nackte
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Waiver submitted successfully
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          Your waiver has been received and saved successfully. Thank you for
          submitting it.
        </p>
        {confirmation ? <p className="mt-4 text-sm text-slate-300">Confirmation: <strong className="text-white">{confirmation}</strong></p> : null}
        {expiresAt ? <p className="mt-1 text-sm text-slate-300">Valid until the exact anniversary: {new Date(expiresAt).toLocaleString()}</p> : null}
        <div className="mt-8">
          {pdf?.startsWith("/camp-nackte/waiver/pdf/") ? <Link href={pdf} target="_blank" className="mr-3 inline-flex rounded-xl border border-blue-500 px-6 py-4 text-lg font-semibold text-blue-200">View PDF</Link> : null}
          <Link
            href="/camp-nackte/waiver"
            className="inline-flex rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-500"
          >
            Submit Another Waiver
          </Link>
        </div>
      </section>
    </main>
  );
}
