import { supabase } from "@/lib/supabase";

type WaiverSubmission = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  visit_date: string | null;
  created_at: string | null;
};

export default async function CampNackteWaiverSubmissionsPage() {
  const { data, error } = await supabase
    .from("camp_nackte_waivers")
    .select("id, full_name, email, phone, visit_date, created_at")
    .order("created_at", { ascending: false });

  const submissions = (data ?? []) as WaiverSubmission[];

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white md:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Camp Nackte
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Signed Waivers
          </h1>
          <p className="mt-3 text-slate-300">
            A simple list of waiver submissions from the same table used by the
            submission route.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-red-200">
            Unable to load waiver submissions right now.
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            No waiver submissions have been recorded yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {submission.full_name || "Unnamed guest"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {submission.visit_date || "No visit date"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {submission.created_at
                      ? new Date(submission.created_at).toLocaleString()
                      : "Unknown time"}
                  </p>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-300">
                  {submission.email ? <p>Email: {submission.email}</p> : null}
                  {submission.phone ? <p>Phone: {submission.phone}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
