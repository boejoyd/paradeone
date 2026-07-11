"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ParticipantLocationButtonProps = {
  token: string;
  initialLastGpsUpdate: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export function ParticipantLocationButton({
  token,
  initialLastGpsUpdate,
}: ParticipantLocationButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string | null>(
    initialLastGpsUpdate
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const formattedLastGpsUpdate = useMemo(
    () => formatTimestamp(lastGpsUpdate),
    [lastGpsUpdate]
  );

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const startLocationSharing = () => {
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported on this device.");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const response = await fetch("/api/participant/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setErrorMessage(payload?.error || "Unable to save live location update.");
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { updatedAt?: string }
          | null;

        setIsSharing(true);
        setLastGpsUpdate(payload?.updatedAt || new Date().toISOString());
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage("Location permission denied.");
        } else {
          setErrorMessage("Unable to read your location right now.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startLocationSharing}
        className="w-full rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-3 text-left text-sm font-semibold text-blue-100"
      >
        📍 Share Live Location
      </button>

      {isSharing ? (
        <p className="text-sm font-medium text-emerald-300">Location Sharing Active</p>
      ) : null}

      {formattedLastGpsUpdate ? (
        <p className="text-sm text-slate-300">Last GPS Update: {formattedLastGpsUpdate}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-rose-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
