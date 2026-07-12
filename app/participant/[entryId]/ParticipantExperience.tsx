"use client";

import { useEffect, useState } from "react";

import type { ParticipantPushOffEstimate } from "@/lib/participantPushOffEstimate";
import { ParticipantActionsCard } from "./ParticipantActionsCard";
import { PushOffEstimateCard } from "./PushOffEstimateCard";
import { updateParticipantStatus } from "./actions";

type ParticipantExperienceProps = {
  token: string;
  initialRouteState: string;
  initialRouteCompletedAt: string | null;
  initialEstimate: ParticipantPushOffEstimate;
  stagingLatitude: number | null;
  stagingLongitude: number | null;
  geofenceRadiusFeet: number;
  initialLastGpsUpdate: string | null;
  directionsHref: string | null;
  message?: string;
};

export function ParticipantExperience(props: ParticipantExperienceProps) {
  const [routeState, setRouteState] = useState(props.initialRouteState);
  const [completedAt, setCompletedAt] = useState(props.initialRouteCompletedAt);
  const completed = routeState === "completed";

  useEffect(() => {
    if (completed) return;
    let cancelled = false;
    const poll = async () => {
      const response = await fetch(`/api/participant/status?token=${encodeURIComponent(props.token)}`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => null) as { ok?: boolean; routeState?: string; routeCompletedAt?: string | null } | null;
      if (cancelled || !payload?.ok || !payload.routeState) return;
      setRouteState(payload.routeState);
      setCompletedAt(payload.routeCompletedAt || null);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [completed, props.token]);

  if (completed) {
    return <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-black text-slate-950">✓</div>
      <p className="mt-5 text-xs uppercase tracking-[0.35em] text-emerald-300">Route Completed</p>
      <h2 className="mt-2 text-2xl font-bold text-white">Thank you for being part of the parade!</h2>
      <p className="mt-3 text-sm leading-6 text-slate-200">Your parade unit has completed the route. You may now stop sharing your location and close this page.</p>
      {completedAt ? <p className="mt-4 text-xs text-slate-400">Completed {new Date(completedAt).toLocaleString()}</p> : null}
    </section>;
  }

  return <>
    <PushOffEstimateCard token={props.token} initialEstimate={props.initialEstimate} />
    <div className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100">Please keep this page open until your parade unit has completed the route. Closing this page may stop live location updates to Mission Control.</div>
    {props.message ? <div className="rounded-2xl border border-blue-700/40 bg-blue-950/30 p-4 text-sm text-blue-100">{props.message}</div> : null}
    <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      {(["getting_ready", "ready", "needs_assistance"] as const).map((status) => (
        <form key={status} action={updateParticipantStatus}>
          <input type="hidden" name="token" value={props.token} />
          <input type="hidden" name="status" value={status} />
          <button type="submit" className={status === "ready" ? "w-full rounded-xl border border-green-700 bg-green-600 px-4 py-3 text-left text-sm font-semibold text-white" : status === "getting_ready" ? "w-full rounded-xl border border-yellow-400 bg-yellow-300 px-4 py-3 text-left text-sm font-semibold text-slate-950" : "w-full rounded-xl border border-red-700 bg-red-600 px-4 py-3 text-left text-sm font-semibold text-white"}>
            {status === "ready" ? "Ready" : status === "getting_ready" ? "Getting Ready" : "Need Assistance"}
          </button>
        </form>
      ))}
      <ParticipantActionsCard
        token={props.token}
        stagingLatitude={props.stagingLatitude}
        stagingLongitude={props.stagingLongitude}
        geofenceRadiusFeet={props.geofenceRadiusFeet}
        initialLastGpsUpdate={props.initialLastGpsUpdate}
        directionsHref={props.directionsHref}
        initialRouteState={routeState}
        onRouteStateChange={(state, routeCompletedAt) => { setRouteState(state); if (routeCompletedAt) setCompletedAt(routeCompletedAt); }}
      />
    </div>
    {!props.directionsHref ? <p className="text-sm text-slate-400">Directions coming soon.</p> : null}
  </>;
}
