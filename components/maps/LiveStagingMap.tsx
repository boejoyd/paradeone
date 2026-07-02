"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

type MapSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  entries?: { name: string; check_in_status: string | null }[] | null;
};

type LiveStagingMapProps = {
  spots: MapSpot[];
  editBasePath?: string;
};

function formatStatus(status: string | null | undefined) {
  if (!status) return "Not checked in";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function LiveStagingMap({ spots, editBasePath }: LiveStagingMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!mapContainer.current || !token || mapRef.current) return;

    mapboxgl.accessToken = token;

    const validSpots = spots.filter(
      (spot) => spot.latitude !== null && spot.longitude !== null
    );

    const center: [number, number] =
      validSpots.length > 0
        ? [validSpots[0].longitude!, validSpots[0].latitude!]
        : [-98.4936, 29.4241];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: validSpots.length > 0 ? 16 : 12,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    validSpots.forEach((spot) => {
      const assignedEntry = Array.isArray(spot.entries)
        ? spot.entries[0]
        : null;

      const isCheckedIn = assignedEntry?.check_in_status === "checked_in";

      const markerEl = document.createElement("div");
      markerEl.className = [
        "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg",
        isCheckedIn ? "bg-green-600" : assignedEntry ? "bg-yellow-600" : "bg-slate-600",
      ].join(" ");
      markerEl.textContent = spot.spot_code;

      const editHref = editBasePath
        ? `${editBasePath}/${spot.id}/edit`
        : "#";

      new mapboxgl.Marker(markerEl)
        .setLngLat([spot.longitude!, spot.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="min-width: 220px;">
              <strong style="font-size: 16px;">${spot.spot_code}</strong>
              <div style="margin-top: 8px;">${spot.section || "No section"}</div>
              <div>${spot.street_name || "No street"}</div>
              <hr style="margin: 10px 0;" />
              <div><strong>Assigned:</strong> ${assignedEntry?.name || "Empty Spot"}</div>
              <div><strong>Status:</strong> ${formatStatus(assignedEntry?.check_in_status)}</div>
              ${
                editBasePath
                  ? `<a href="${editHref}" style="display:inline-block;margin-top:12px;color:#2563eb;font-weight:700;">Edit Spot</a>`
                  : ""
              }
            </div>
          `)
        )
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [spots, editBasePath]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <div ref={mapContainer} className="h-[520px] w-full" />
    </div>
  );
}
