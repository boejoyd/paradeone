"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ParticipantActionsCardProps = {
  token: string;
  stagingLatitude: number | null;
  stagingLongitude: number | null;
  geofenceRadiusFeet: number;
  initialLastGpsUpdate: string | null;
  directionsHref: string | null;
};

type LocationPayload = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function formatDistance(distanceFeet: number | null) {
  if (distanceFeet === null) {
    return null;
  }

  if (distanceFeet < 1000) {
    return `${Math.round(distanceFeet)} ft`;
  }

  return `${(distanceFeet / 5280).toFixed(2)} mi`;
}

export function ParticipantActionsCard({
  token,
  stagingLatitude,
  stagingLongitude,
  geofenceRadiusFeet,
  initialLastGpsUpdate,
  directionsHref,
}: ParticipantActionsCardProps) {
  const [status, setStatus] = useState<string>("Not Checked In");
  const [isSharing, setIsSharing] = useState(false);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string | null>(initialLastGpsUpdate);
  const [currentLocation, setCurrentLocation] = useState<LocationPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  const formattedLastGpsUpdate = useMemo(
    () => formatTimestamp(lastGpsUpdate),
    [lastGpsUpdate]
  );

  const distanceFeet = useMemo(() => {
    if (!currentLocation || stagingLatitude === null || stagingLongitude === null) {
      return null;
    }

    const earthRadiusMeters = 6371000;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const deltaLatitude = toRadians(stagingLatitude - currentLocation.latitude);
    const deltaLongitude = toRadians(stagingLongitude - currentLocation.longitude);
    const radiansLatitudeA = toRadians(currentLocation.latitude);
    const radiansLatitudeB = toRadians(stagingLatitude);

    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(radiansLatitudeA) *
        Math.cos(radiansLatitudeB) *
        Math.sin(deltaLongitude / 2) *
        Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = earthRadiusMeters * c;
    return meters * 3.28084;
  }, [currentLocation, stagingLatitude, stagingLongitude]);

  const isWithinGeofence =
    distanceFeet !== null && distanceFeet <= geofenceRadiusFeet;

  const shareLiveLocation = () => {
    setErrorMessage(null);
    setCheckInMessage(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const response = await fetch("/api/participant/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            latitude,
            longitude,
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
        setCurrentLocation({ latitude, longitude, updatedAt: payload?.updatedAt || new Date().toISOString() });
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

  const checkInDisabled =
    !isSharing ||
    currentLocation === null ||
    stagingLatitude === null ||
    stagingLongitude === null ||
    !isWithinGeofence ||
    isSubmittingCheckIn;

  const checkInButtonClass = checkInDisabled
    ? "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-left text-sm font-semibold text-slate-400"
    : "w-full rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-3 text-left text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-500/10";

  const handleCheckIn = async () => {
    if (checkInDisabled || !currentLocation) {
      return;
    }

    setIsSubmittingCheckIn(true);
    setCheckInMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/participant/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; checkedInAt?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(payload?.error || "Unable to complete check-in.");
        return;
      }

      setStatus("Checked In");
      setCheckInMessage("Checked in successfully.");
      if (payload.checkedInAt) {
        setLastGpsUpdate(payload.checkedInAt);
      }
      window.location.reload();
    } catch {
      setErrorMessage("Unable to complete check-in.");
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const locationNotice =
    stagingLatitude === null || stagingLongitude === null
      ? "Check-in location is not available yet."
      : !isSharing
        ? null
        : currentLocation === null
          ? null
          : isWithinGeofence
            ? `Within geofence (${formatDistance(distanceFeet)} of ${geofenceRadiusFeet} ft radius).`
            : "You are not at your assigned staging location yet.";

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <button
        type="button"
        onClick={shareLiveLocation}
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

      {locationNotice ? (
        <p className="text-sm text-amber-200">{locationNotice}</p>
      ) : null}

      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

      {checkInMessage ? <p className="text-sm text-emerald-300">{checkInMessage}</p> : null}

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={checkInDisabled}
        className={checkInButtonClass}
      >
        ✅ Check In
      </button>

      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
        Current Status: {status}
      </p>

      {directionsHref ? (
        <Link
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-100"
        >
          🧭 Open Directions
        </Link>
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-left text-sm font-semibold text-slate-300"
        >
          🧭 Open Directions
        </button>
      )}
    </div>
  );
}
