"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

type StagingLocationPickerProps = {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  existingSpots?: ExistingStagingSpot[];
};

type ExistingStagingSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  entries?: { name: string }[] | { name: string } | null;
};

function existingMarkerElement(spotCode: string) {
  const element = document.createElement("div");
  element.classList.add("flex", "h-10", "min-w-10", "cursor-pointer", "items-center", "justify-center", "rounded-full", "border-2", "border-slate-200", "bg-slate-600", "px-2", "text-xs", "font-bold", "text-white", "shadow-lg");
  element.textContent = spotCode;
  return element;
}

function temporaryMarkerElement() {
  const element = document.createElement("div");
  element.classList.add("flex", "h-12", "min-w-12", "items-center", "justify-center", "rounded-full", "border-4", "border-white", "bg-orange-500", "px-2", "text-[10px]", "font-black", "text-slate-950", "shadow-xl", "ring-4", "ring-orange-400/40");
  element.textContent = "NEW";
  return element;
}

function popupContent(spot: ExistingStagingSpot) {
  const container = document.createElement("div");
  container.style.minWidth = "200px";
  const title = document.createElement("strong");
  title.style.fontSize = "16px";
  title.textContent = spot.spot_code;
  container.appendChild(title);
  const assignedEntry = Array.isArray(spot.entries) ? spot.entries[0] : spot.entries;
  for (const value of [
    `Section: ${spot.section || "Not set"}`,
    `Street: ${spot.street_name || "Not set"}`,
    `Assigned: ${assignedEntry?.name || "Unassigned"}`,
  ]) {
    const row = document.createElement("div");
    row.style.marginTop = "6px";
    row.textContent = value;
    container.appendChild(row);
  }
  return container;
}

function coordinatesAreValid(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function StagingLocationPicker({ initialLatitude = null, initialLongitude = null, existingSpots = [] }: StagingLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const existingMarkerRecordsRef = useRef<mapboxgl.Marker[]>([]);
  const initialExistingSpotsRef = useRef(existingSpots);
  const hasInitialCoordinates = initialLatitude !== null && initialLongitude !== null && coordinatesAreValid(initialLatitude, initialLongitude);
  const firstExistingSpot = existingSpots.find((spot) => spot.latitude !== null && spot.longitude !== null && coordinatesAreValid(spot.latitude, spot.longitude));
  const centerRef = useRef<[number, number]>(hasInitialCoordinates ? [initialLongitude!, initialLatitude!] : firstExistingSpot ? [firstExistingSpot.longitude!, firstExistingSpot.latitude!] : [-98.4936, 29.4241]);
  const [latitude, setLatitude] = useState(initialLatitude === null ? "" : String(initialLatitude));
  const [longitude, setLongitude] = useState(initialLongitude === null ? "" : String(initialLongitude));
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !token || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: centerRef.current,
      zoom: hasInitialCoordinates ? 16 : 12,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const locatedExistingSpots = initialExistingSpotsRef.current.filter(
      (spot) => spot.latitude !== null && spot.longitude !== null && coordinatesAreValid(spot.latitude, spot.longitude)
    );
    for (const spot of locatedExistingSpots) {
      const element = existingMarkerElement(spot.spot_code);
      element.addEventListener("click", (event) => event.stopPropagation());
      const marker = new mapboxgl.Marker({ element, draggable: false })
        .setLngLat([spot.longitude!, spot.latitude!])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(popupContent(spot)))
        .addTo(map);
      existingMarkerRecordsRef.current.push(marker);
    }
    map.on("click", (event) => {
      setLatitude(event.lngLat.lat.toFixed(6));
      setLongitude(event.lngLat.lng.toFixed(6));
    });

    const resizeMap = () => map.resize();
    resizeMap();
    map.once("load", () => {
      resizeMap();
      if (locatedExistingSpots.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        locatedExistingSpots.forEach((spot) => bounds.extend([spot.longitude!, spot.latitude!]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 17 });
      }
    });
    const observer = new ResizeObserver(resizeMap);
    observer.observe(container);

    return () => {
      observer.disconnect();
      existingMarkerRecordsRef.current.forEach((marker) => marker.remove());
      existingMarkerRecordsRef.current = [];
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [hasInitialCoordinates, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const valid = latitude !== "" && longitude !== "" && coordinatesAreValid(parsedLatitude, parsedLongitude);

    if (!valid) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position: [number, number] = [parsedLongitude, parsedLatitude];
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: temporaryMarkerElement() }).setLngLat(position).addTo(map);
    } else {
      markerRef.current.setLngLat(position);
    }
  }, [latitude, longitude]);

  return (
    <div className="grid gap-5">
      {token ? (
        <div ref={mapContainerRef} className="h-[420px] min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950" />
      ) : (
        <p className="rounded-xl border border-amber-900 bg-amber-950/50 px-4 py-3 text-sm text-amber-300">
          Mapbox is unavailable. Enter the staging coordinates manually.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-300">Latitude</span>
          <input name="latitude" type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="29.4241" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-300">Longitude</span>
          <input name="longitude" type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-98.4936" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
        </label>
      </div>
    </div>
  );
}
