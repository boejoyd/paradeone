"use client";

import { useEffect, useMemo, useState } from "react";

type EstimateState = "estimate" | "pushed_off" | "unavailable" | "paused";

type PushOffEstimate = {
  state: EstimateState;
  unitsAhead: number | null;
  estimatedMinutes: number | null;
  releasePaceSeconds: number;
  usingFallbackPace: boolean;
  message: string;
};

type PushOffEstimateCardProps = {
  token: string;
  initialEstimate: PushOffEstimate;
};

export function PushOffEstimateCard({ token, initialEstimate }: PushOffEstimateCardProps) {
  const [estimate, setEstimate] = useState<PushOffEstimate>(initialEstimate);

  useEffect(() => {
    let isCancelled = false;

    const fetchEstimate = async () => {
      const response = await fetch(
        `/api/participant/push-off-estimate?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      ).catch(() => null);

      if (!response || !response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; estimate: PushOffEstimate }
        | { ok: false; error?: string }
        | null;

      if (isCancelled || !payload || !payload.ok) {
        return;
      }

      setEstimate(payload.estimate);
    };

    const timer = window.setInterval(() => {
      void fetchEstimate();
    }, 10000);

    void fetchEstimate();

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const releasePaceText = useMemo(
    () => `approximately one unit every ${Math.max(1, Math.round(estimate.releasePaceSeconds))} seconds`,
    [estimate.releasePaceSeconds]
  );

  return (
    <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/50 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estimated Push-Off</p>

      {estimate.state === "pushed_off" ? (
        <p className="mt-2 text-sm font-medium text-emerald-200">Your parade unit has pushed off.</p>
      ) : estimate.state === "unavailable" ? (
        <p className="mt-2 text-sm text-slate-300">Estimate unavailable until lineup position is assigned.</p>
      ) : estimate.state === "paused" ? (
        <>
          <p className="mt-2 text-sm font-medium text-amber-200">
            Push-off is currently paused. Mission Control will update this estimate.
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {estimate.unitsAhead ?? 0} units currently ahead
          </p>
          <p className="mt-1 text-xs text-slate-400">Current release pace: {releasePaceText}</p>
          <p className="mt-1 text-xs text-slate-400">Estimate updates automatically.</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-semibold text-white">
            approximately {estimate.estimatedMinutes ?? 0} minutes
          </p>
          <p className="text-sm text-slate-300">{estimate.unitsAhead ?? 0} units currently ahead</p>
          <p className="mt-1 text-xs text-slate-400">Current release pace: {releasePaceText}</p>
          <p className="mt-1 text-xs text-slate-400">Estimate updates automatically.</p>
        </>
      )}
    </div>
  );
}
