import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getParticipantTokenPayload } from "@/lib/participantToken";
import { getParticipantPushOffEstimateByToken } from "@/lib/participantPushOffEstimate";
import { ParticipantActionsCard } from "./ParticipantActionsCard";
import { PushOffEstimateCard } from "./PushOffEstimateCard";
import { updateParticipantStatus } from "./actions";

type ParticipantPageProps = {
  params: Promise<{
    entryId: string;
  }>;
  searchParams?: Promise<{
    message?: string | string[];
  }>;
};

function statusLabel(status: string | null | undefined) {
  if (status === "moving") return "Moving";
  if (status === "ready" || status === "checked_in") return "Ready";
  if (status === "getting_ready" || status === "staging" || status === "queued") {
    return "Getting Ready";
  }
  if (status === "needs_assistance") return "Need Assistance";
  return "Not Checked In";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "moving") {
    return "border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-lg shadow-emerald-500/10 animate-pulse";
  }

  if (status === "ready" || status === "checked_in") {
    return "border-emerald-400/50 bg-emerald-500/15 text-emerald-100";
  }

  if (status === "getting_ready" || status === "staging" || status === "queued") {
    return "border-amber-400/50 bg-amber-500/15 text-amber-100";
  }

  if (status === "needs_assistance") {
    return "border-red-400/50 bg-red-500/15 text-red-100";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

export default async function ParticipantPage({
  params,
  searchParams,
}: ParticipantPageProps) {
  const { entryId } = await params;
  const resolvedSearchParams = await searchParams;
  const messageParam = resolvedSearchParams?.message;
  const message = typeof messageParam === "string" ? messageParam : undefined;
  const token = decodeURIComponent(entryId);
  const payload = await getParticipantTokenPayload(token);

  if (!payload) {
    notFound();
  }

  const { data: entry, error } = await supabase
    .from("entries")
    .select(
      "id, name, event_id, parade_number, lineup_position, check_in_status, staging_spots(spot_code, section, street_name, latitude, longitude, geofence_radius_feet)"
    )
    .eq("id", payload.entryId)
    .single();

  if (error || !entry || entry.event_id !== payload.eventId) {
    notFound();
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, organization_id")
    .eq("id", payload.eventId)
    .single();

  if (!event || event.organization_id !== payload.organizationId) {
    notFound();
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", payload.organizationId)
    .single();

  if (!organization) {
    notFound();
  }

  const spot = Array.isArray(entry.staging_spots)
    ? entry.staging_spots[0]
    : entry.staging_spots;

  const pushOffEstimate = await getParticipantPushOffEstimateByToken(token);

  if (!pushOffEstimate) {
    notFound();
  }

  const { data: latestLocationUpdate } = await supabase
    .from("check_ins")
    .select("created_at")
    .eq("entry_id", payload.entryId)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const directionsHref =
    typeof spot?.latitude === "number" && typeof spot?.longitude === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`
      : null;

  const stagingLatitude = typeof spot?.latitude === "number" ? spot.latitude : null;
  const stagingLongitude = typeof spot?.longitude === "number" ? spot.longitude : null;
  const geofenceRadiusFeet =
    typeof spot?.geofence_radius_feet === "number" ? spot.geofence_radius_feet : 150;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <section className="mx-auto max-w-md space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Parade Participant
          </p>
          <p className="mt-2 text-sm text-slate-300">{organization.name}</p>
          <h1 className="mt-3 text-2xl font-bold leading-tight">{event.name}</h1>
          <p className="mt-2 text-sm text-slate-300">Unit: {entry.name}</p>
          <p className="text-sm text-slate-300">Entry Number: #{entry.parade_number || "TBD"}</p>
          <p className="mt-2 text-sm text-slate-300">
            Staging: {spot?.spot_code || "TBD"}
            {spot?.street_name ? ` • ${spot.street_name}` : ""}
            {spot?.section ? ` • ${spot.section}` : ""}
          </p>
          <PushOffEstimateCard token={token} initialEstimate={pushOffEstimate} />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
              Current Status
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(entry.check_in_status)}`}
            >
              {statusLabel(entry.check_in_status)}
            </span>
          </div>
        </header>

        <div className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100">
          Please keep this page open until your parade unit has completed the route. Closing this page may stop live location updates to Mission Control.
        </div>

        {message ? (
          <div className="rounded-2xl border border-blue-700/40 bg-blue-950/30 p-4 text-sm text-blue-100">
            {message}
          </div>
        ) : null}

        <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <form action={updateParticipantStatus}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="status" value="getting_ready" />
            <button
              type="submit"
              className="w-full rounded-xl border border-yellow-500/40 bg-yellow-600/15 px-4 py-3 text-left text-sm font-semibold text-yellow-100"
            >
              🟡 Getting Ready
            </button>
          </form>

          <form action={updateParticipantStatus}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="status" value="ready" />
            <button
              type="submit"
              className="w-full rounded-xl border border-green-500/40 bg-green-600/15 px-4 py-3 text-left text-sm font-semibold text-green-100"
            >
              🟢 Ready
            </button>
          </form>

          <form action={updateParticipantStatus}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="status" value="needs_assistance" />
            <button
              type="submit"
              className="w-full rounded-xl border border-red-500/40 bg-red-600/15 px-4 py-3 text-left text-sm font-semibold text-red-100"
            >
              🔴 Need Assistance
            </button>
          </form>

          <ParticipantActionsCard
            token={token}
            stagingLatitude={stagingLatitude}
            stagingLongitude={stagingLongitude}
            geofenceRadiusFeet={geofenceRadiusFeet}
            initialLastGpsUpdate={latestLocationUpdate?.created_at || null}
            directionsHref={directionsHref}
          />
        </div>

        {!directionsHref ? (
          <p className="text-sm text-slate-400">Directions coming soon.</p>
        ) : null}
      </section>
    </main>
  );
}
