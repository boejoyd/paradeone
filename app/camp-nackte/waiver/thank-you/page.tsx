import Link from "next/link";

export default function CampNackteThankYouPage() {
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
        <div className="mt-8">
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
