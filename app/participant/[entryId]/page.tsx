import { notFound } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getParticipantTokenPayload } from "@/lib/participantToken";
import { getParticipantPushOffEstimateByToken } from "@/lib/participantPushOffEstimate";
import { ParticipantExperience } from "./ParticipantExperience";

type ParticipantPageProps = {
  params: Promise<{ entryId: string }>;
  searchParams?: Promise<{ message?: string | string[] }>;
};

function statusLabel(status: string | null | undefined) {
  if (status === "moving") return "Moving";
  if (status === "ready" || status === "checked_in") return "Ready";
  if (status === "getting_ready" || status === "staging" || status === "queued") return "Getting Ready";
  if (status === "needs_assistance") return "Need Assistance";
  return "Not Checked In";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "moving") return "border-emerald-700 bg-emerald-600 text-white animate-pulse";
  if (status === "ready" || status === "checked_in") return "border-green-700 bg-green-600 text-white";
  if (status === "getting_ready" || status === "staging" || status === "queued") return "border-yellow-400 bg-yellow-300 text-slate-950";
  if (status === "needs_assistance") return "border-red-700 bg-red-600 text-white";
  return "border-slate-600 bg-slate-600 text-white";
}

export default async function ParticipantPage({ params, searchParams }: ParticipantPageProps) {
  const { entryId } = await params;
  const resolvedSearchParams = await searchParams;
  const messageParam = resolvedSearchParams?.message;
  const message = typeof messageParam === "string" ? messageParam : undefined;
  const token = decodeURIComponent(entryId);
  const payload = await getParticipantTokenPayload(token);
  if (!payload) notFound();

  const { data: entry, error } = await supabase
    .from("entries")
    .select("id, name, event_id, parade_number, check_in_status, route_state, route_completed_at, staging_spots(spot_code, section, street_name, latitude, longitude, geofence_radius_feet)")
    .eq("id", payload.entryId)
    .single();
  if (error || !entry || entry.event_id !== payload.eventId) notFound();

  const [{ data: event }, { data: organization }, pushOffEstimate, { data: latestLocationUpdate }] = await Promise.all([
    supabase.from("events").select("id, name, organization_id").eq("id", payload.eventId).single(),
    supabase.from("organizations").select("id, name").eq("id", payload.organizationId).single(),
    getParticipantPushOffEstimateByToken(token),
    supabase.from("check_ins").select("created_at").eq("entry_id", payload.entryId).not("latitude", "is", null).not("longitude", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!event || event.organization_id !== payload.organizationId || !organization || !pushOffEstimate) notFound();

  const spot = Array.isArray(entry.staging_spots) ? entry.staging_spots[0] : entry.staging_spots;
  const stagingLatitude = typeof spot?.latitude === "number" ? spot.latitude : null;
  const stagingLongitude = typeof spot?.longitude === "number" ? spot.longitude : null;
  const geofenceRadiusFeet = typeof spot?.geofence_radius_feet === "number" ? spot.geofence_radius_feet : 150;
  const directionsHref = stagingLatitude !== null && stagingLongitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stagingLatitude},${stagingLongitude}`
    : null;

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-md space-y-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Parade Participant</p>
        <p className="mt-2 text-sm text-slate-300">{organization.name}</p>
        <h1 className="mt-3 text-2xl font-bold leading-tight">{event.name}</h1>
        <p className="mt-2 text-sm text-slate-300">Unit: {entry.name}</p>
        <p className="text-sm text-slate-300">Entry Number: #{entry.parade_number || "TBD"}</p>
        <p className="mt-2 text-sm text-slate-300">Staging: {spot?.spot_code || "TBD"}{spot?.street_name ? ` • ${spot.street_name}` : ""}{spot?.section ? ` • ${spot.section}` : ""}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Current Status</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(entry.check_in_status)}`}>{statusLabel(entry.check_in_status)}</span>
        </div>
      </header>
      <ParticipantExperience
        token={token}
        initialRouteState={entry.route_state}
        initialRouteCompletedAt={entry.route_completed_at}
        initialEstimate={pushOffEstimate}
        stagingLatitude={stagingLatitude}
        stagingLongitude={stagingLongitude}
        geofenceRadiusFeet={geofenceRadiusFeet}
        initialLastGpsUpdate={latestLocationUpdate?.created_at || null}
        directionsHref={directionsHref}
        message={message}
      />
    </section>
  </main>;
}
