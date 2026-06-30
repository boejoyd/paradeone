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
};

export function LiveStagingMap({ spots }: LiveStagingMapProps) {
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

      const markerEl = document.createElement("div");
      markerEl.className =
        "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-xs font-bold text-white shadow-lg";
      markerEl.textContent = spot.spot_code;

      new mapboxgl.Marker(markerEl)
        .setLngLat([spot.longitude!, spot.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <strong>${spot.spot_code}</strong><br/>
            ${spot.section || "No section"}<br/>
            ${spot.street_name || "No street"}<br/>
            ${assignedEntry?.name || "Empty Spot"}
          `)
        )
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [spots]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <div ref={mapContainer} className="h-[520px] w-full" />
    </div>
  );
}
