import Image from "next/image";
import { notFound } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RegistrationForm } from "./RegistrationForm";

type Props = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export default async function PublicRegistrationPage({ params }: Props) {
  const { eventId } = await params;
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return <main className="min-h-screen bg-slate-950 px-5 py-12 text-white"><p className="mx-auto max-w-xl">Registration is temporarily unavailable.</p></main>;
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, event_date, start_time, city, status, organizations(name)")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) notFound();

  const organization = Array.isArray(event.organizations) ? event.organizations[0] : event.organizations;
  const open = event.status === "registration_open";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <section className="mx-auto max-w-3xl">
        <header className="mb-7 flex items-center gap-4">
          <Image src="/paradeone-mark.png" alt="ParadeOne" width={64} height={64} className="rounded-xl bg-white" priority />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">ParadeOne Registration</p>
            <p className="mt-1 text-sm text-slate-300">{organization?.name || "Parade Organizer"}</p>
          </div>
        </header>

        <div className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.name}</h1>
          <p className="mt-3 text-slate-300">
            {[event.city, event.event_date, event.start_time].filter(Boolean).join(" • ") || "Event details will be announced by the organizer."}
          </p>
        </div>

        {open ? (
          <RegistrationForm eventId={eventId} />
        ) : (
          <div className="rounded-2xl border border-amber-700 bg-amber-950/40 p-7">
            <h2 className="text-2xl font-bold">Registration is currently closed</h2>
            <p className="mt-3 text-amber-100">Please contact the parade organizer if you believe registration should be available.</p>
          </div>
        )}
      </section>
    </main>
  );
}
