"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveCheckIn } from "@/app/check-in/[entryId]/actions";

type CheckInClientProps = {
  entryId: string;
  spotLatitude: number | null;
  spotLongitude: number | null;
  geofenceRadiusFeet: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInFeet(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusFeet = 20902231;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusFeet * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function CheckInClient({
  entryId,
  spotLatitude,
  spotLongitude,
  geofenceRadiusFeet,
}: CheckInClientProps) {
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  function checkLocation() {
    if (!spotLatitude || !spotLongitude) {
      setMessage("This entry does not have an assigned GPS staging spot yet.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Your device does not support GPS location.");
      return;
    }

    setMessage("Checking your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentDistance = distanceInFeet(
          position.coords.latitude,
          position.coords.longitude,
          spotLatitude,
          spotLongitude
        );

        setDistance(currentDistance);

        if (currentDistance > geofenceRadiusFeet) {
          setMessage("You are not close enough to your assigned spot yet.");
          return;
        }

        setMessage("You are in the correct staging spot. Saving check-in...");

        await saveCheckIn({
          entryId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          distanceFromSpotFeet: currentDistance,
        });

        setIsCheckedIn(true);
        setMessage("You are checked in. Please remain in your assigned spot.");
      },
      () => {
        setMessage("Location permission was denied or unavailable.");
      },
      {
        enableHighAccuracy: true,
      }
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      <Button onClick={checkLocation}>
        {isCheckedIn ? "Checked In" : "Check In"}
      </Button>

      {distance !== null && (
        <p className="text-slate-400">
          Distance from assigned spot: {Math.round(distance)} feet
        </p>
      )}

      {message && <p className="text-slate-300">{message}</p>}
    </div>
  );
}
