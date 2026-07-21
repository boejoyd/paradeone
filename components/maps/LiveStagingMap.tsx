"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import type { MissionControlRouteCheckpoint } from "@/lib/data/missionControl";

type Coordinate = [number, number];
type MapEntry = {
  id: string;
  name: string;
  parade_number: number | null;
  check_in_status: string | null;
  route_state: string;
  gps_lat: number | null;
  gps_lng: number | null;
  active_checkpoint_names: string[];
};
type MapSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  entries?: MapEntry[] | null;
};

type LiveStagingMapProps = {
  spots: MapSpot[];
  routeGeometry?: unknown;
  checkpoints?: MissionControlRouteCheckpoint[];
  editBasePath?: string;
  fillHeight?: boolean;
};

type MarkerRecord = {
  marker: mapboxgl.Marker;
  markerEl: HTMLDivElement;
  popup: mapboxgl.Popup;
  latitude: number;
  longitude: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Not checked in";
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function routeCoordinates(geometry: unknown): Coordinate[] {
  if (!geometry || typeof geometry !== "object") return [];
  const candidate = geometry as {
    type?: unknown;
    coordinates?: unknown;
    geometry?: { type?: unknown; coordinates?: unknown };
  };
  const source = candidate.type === "Feature" ? candidate.geometry : candidate;
  if (source?.type !== "LineString" || !Array.isArray(source.coordinates)) return [];
  return source.coordinates.flatMap((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return [];
    const longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude)
      ? ([[longitude, latitude]] as Coordinate[])
      : [];
  });
}

function routeData(geometry: unknown) {
  const coordinates = routeCoordinates(geometry);
  if (coordinates.length < 2) return { type: "FeatureCollection" as const, features: [] };
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
}

function geofenceData(checkpoints: MissionControlRouteCheckpoint[]) {
  const feetPerLatitudeDegree = 364_000;
  return {
    type: "FeatureCollection" as const,
    features: checkpoints.map((checkpoint) => {
      const latitudeRadius = checkpoint.geofence_radius_feet / feetPerLatitudeDegree;
      const longitudeRadius = latitudeRadius / Math.max(Math.cos((checkpoint.latitude * Math.PI) / 180), 0.2);
      const coordinates: Coordinate[] = [];
      for (let index = 0; index <= 48; index += 1) {
        const angle = (index / 48) * Math.PI * 2;
        coordinates.push([
          checkpoint.longitude + Math.cos(angle) * longitudeRadius,
          checkpoint.latitude + Math.sin(angle) * latitudeRadius,
        ]);
      }
      return {
        type: "Feature" as const,
        properties: { name: checkpoint.name, checkpointType: checkpoint.checkpoint_type },
        geometry: { type: "Polygon" as const, coordinates: [coordinates] },
      };
    }),
  };
}

function toOperationalStatus(status: string | null | undefined) {
  if (!status) return "not_checked_in";
  if (status === "ready" || status === "checked_in") return "ready";
  if (status === "getting_ready" || status === "staging" || status === "queued") return "getting_ready";
  if (["moving", "pushed_off", "approaching_start", "on_route", "approaching_finish"].includes(status)) return "moving";
  if (status === "needs_assistance") return "needs_assistance";
  return "not_checked_in";
}

function highlightSpotCard(spotId: string) {
  const card = document.getElementById(`spot-${spotId}`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("ring-2", "ring-blue-500", "bg-slate-900");
  window.setTimeout(() => card.classList.remove("ring-2", "ring-blue-500", "bg-slate-900"), 2500);
}

const markerBaseClasses = [
  "flex", "h-11", "w-11", "cursor-pointer", "items-center", "justify-center", "rounded-full",
  "border-2", "text-xs", "font-bold", "text-white", "shadow-lg",
];
const markerStatusClasses: Record<string, string[]> = {
  moving: ["border-emerald-100", "bg-emerald-500", "animate-pulse"],
  ready: ["border-green-200", "bg-green-600"],
  getting_ready: ["border-yellow-200", "bg-yellow-600"],
  needs_assistance: ["border-red-100", "bg-red-600", "ring-4", "ring-red-500/60"],
  not_checked_in: ["border-slate-200", "bg-slate-600"],
};
const allMarkerClasses = [...markerBaseClasses, ...Object.values(markerStatusClasses).flat(), "h-12", "w-12", "transition-transform"];

function applyMarkerStatusClasses(markerElement: HTMLDivElement, status: string) {
  markerElement.classList.remove(...allMarkerClasses);
  markerElement.classList.add(...markerBaseClasses, ...(markerStatusClasses[status] || markerStatusClasses.not_checked_in));
}

function buildStagingPopup(spot: MapSpot, editBasePath?: string) {
  const assignedEntry = Array.isArray(spot.entries) ? spot.entries[0] : null;
  const editHref = editBasePath ? `${editBasePath}/${spot.id}/edit` : "#";
  return `<div style="min-width:220px"><strong style="font-size:16px">${escapeHtml(spot.spot_code)}</strong><div style="margin-top:8px">${escapeHtml(spot.section || "No section")}</div><div>${escapeHtml(spot.street_name || "No street")}</div><hr style="margin:10px 0"/><div><strong>Assigned:</strong> ${escapeHtml(assignedEntry?.name || "Empty Spot")}</div><div><strong>Status:</strong> ${escapeHtml(formatStatus(assignedEntry?.check_in_status))}</div>${editBasePath ? `<a href="${escapeHtml(editHref)}" style="display:inline-block;margin-top:12px;color:#60a5fa;font-weight:700">Edit Spot</a>` : ""}</div>`;
}

function buildEntryPopup(entry: MapEntry) {
  const zones = entry.active_checkpoint_names.length ? entry.active_checkpoint_names.join(", ") : "None";
  return `<div style="min-width:220px"><strong style="font-size:16px">${escapeHtml(entry.name)}</strong><div style="margin-top:8px"><strong>Entry:</strong> ${entry.parade_number ?? "TBD"}</div><div><strong>Route state:</strong> ${escapeHtml(formatStatus(entry.route_state))}</div><div><strong>Active geofence:</strong> ${escapeHtml(zones)}</div></div>`;
}

function checkpointLabel(checkpoint: MissionControlRouteCheckpoint) {
  if (checkpoint.checkpoint_type === "route_start") return "S";
  if (checkpoint.checkpoint_type === "route_finish") return "F";
  if (checkpoint.checkpoint_type === "dispersal_exit") return "D";
  if (/announc/i.test(checkpoint.name)) return "A";
  if (/judg|dais/i.test(checkpoint.name)) return "J";
  return "•";
}

export function LiveStagingMap({
  spots,
  routeGeometry = null,
  checkpoints = [],
  editBasePath,
  fillHeight = false,
}: LiveStagingMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const stagingMarkersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const entryMarkersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const checkpointMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const initialSpotsRef = useRef(spots);
  const initialRouteRef = useRef(routeGeometry);
  const initialCheckpointsRef = useRef(checkpoints);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = mapContainer.current;
    if (!container || !token || mapRef.current) return;
    mapboxgl.accessToken = token;
    const routePoints = routeCoordinates(initialRouteRef.current);
    const validSpots = initialSpotsRef.current.filter((spot) => spot.latitude !== null && spot.longitude !== null);
    const firstCheckpoint = initialCheckpointsRef.current[0];
    const center: Coordinate = routePoints[0] ?? (firstCheckpoint
      ? [firstCheckpoint.longitude, firstCheckpoint.latitude]
      : validSpots[0]
        ? [validSpots[0].longitude!, validSpots[0].latitude!]
        : [-98.4936, 29.4241]);
    const map = new mapboxgl.Map({ container, style: "mapbox://styles/mapbox/dark-v11", center, zoom: routePoints.length || firstCheckpoint || validSpots.length ? 14 : 12 });
    mapRef.current = map;
    const stagingMarkers = stagingMarkersRef.current;
    const entryMarkers = entryMarkersRef.current;
    const checkpointMarkers = checkpointMarkersRef.current;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.once("load", () => {
      map.addSource("live-parade-route", { type: "geojson", data: routeData(initialRouteRef.current) });
      map.addLayer({ id: "live-parade-route-line", type: "line", source: "live-parade-route", paint: { "line-color": "#38bdf8", "line-width": 6, "line-opacity": 0.9 } });
      map.addSource("live-checkpoint-geofences", { type: "geojson", data: geofenceData(initialCheckpointsRef.current) });
      map.addLayer({ id: "live-checkpoint-geofence-fill", type: "fill", source: "live-checkpoint-geofences", paint: { "fill-color": "#f59e0b", "fill-opacity": 0.14 } });
      map.addLayer({ id: "live-checkpoint-geofence-line", type: "line", source: "live-checkpoint-geofences", paint: { "line-color": "#fbbf24", "line-width": 2, "line-opacity": 0.8 } });
      const bounds = new mapboxgl.LngLatBounds();
      routePoints.forEach((point) => bounds.extend(point));
      initialCheckpointsRef.current.forEach((checkpoint) => bounds.extend([checkpoint.longitude, checkpoint.latitude]));
      validSpots.forEach((spot) => bounds.extend([spot.longitude!, spot.latitude!]));
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 70, maxZoom: 16 });
      map.resize();
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      stagingMarkers.forEach((record) => record.marker.remove());
      entryMarkers.forEach((record) => record.marker.remove());
      checkpointMarkers.forEach((marker) => marker.remove());
      stagingMarkers.clear();
      entryMarkers.clear();
      checkpointMarkers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource("live-parade-route") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(routeData(routeGeometry));
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("live-checkpoint-geofences") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(geofenceData(checkpoints));
    const liveIds = new Set(checkpoints.map((checkpoint) => checkpoint.id));
    checkpointMarkersRef.current.forEach((marker, id) => {
      if (!liveIds.has(id)) {
        marker.remove();
        checkpointMarkersRef.current.delete(id);
      }
    });
    checkpoints.forEach((checkpoint) => {
      let marker = checkpointMarkersRef.current.get(checkpoint.id);
      if (!marker) {
        const element = document.createElement("div");
        element.className = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-100 bg-amber-500 font-bold text-slate-950 shadow-lg";
        marker = new mapboxgl.Marker(element)
          .setLngLat([checkpoint.longitude, checkpoint.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 22 }).setText(`${checkpoint.name} • ${checkpoint.geofence_radius_feet} ft geofence`))
          .addTo(map);
        checkpointMarkersRef.current.set(checkpoint.id, marker);
      }
      marker.getElement().textContent = checkpointLabel(checkpoint);
      marker.setLngLat([checkpoint.longitude, checkpoint.latitude]);
    });
  }, [checkpoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const validSpots = spots.filter((spot) => spot.latitude !== null && spot.longitude !== null);
    const visibleSpotIds = new Set(validSpots.map((spot) => spot.id));
    stagingMarkersRef.current.forEach((record, spotId) => {
      if (!visibleSpotIds.has(spotId)) {
        record.marker.remove();
        stagingMarkersRef.current.delete(spotId);
      }
    });
    validSpots.forEach((spot) => {
      const entry = Array.isArray(spot.entries) ? spot.entries[0] : null;
      const status = toOperationalStatus(entry?.check_in_status);
      let record = stagingMarkersRef.current.get(spot.id);
      if (!record) {
        const markerEl = document.createElement("div");
        markerEl.addEventListener("click", () => highlightSpotCard(spot.id));
        const popup = new mapboxgl.Popup({ offset: 25 });
        const marker = new mapboxgl.Marker(markerEl).setLngLat([spot.longitude!, spot.latitude!]).setPopup(popup).addTo(map);
        record = { marker, markerEl, popup, latitude: spot.latitude!, longitude: spot.longitude! };
        stagingMarkersRef.current.set(spot.id, record);
      }
      applyMarkerStatusClasses(record.markerEl, status);
      record.markerEl.textContent = spot.spot_code;
      record.popup.setHTML(buildStagingPopup(spot, editBasePath));
      record.marker.setLngLat([spot.longitude!, spot.latitude!]);
    });

    const entries = spots.flatMap((spot) => (Array.isArray(spot.entries) ? spot.entries : []));
    const liveEntries = entries.filter((entry) => typeof entry.gps_lat === "number" && typeof entry.gps_lng === "number");
    const liveEntryIds = new Set(liveEntries.map((entry) => entry.id));
    entryMarkersRef.current.forEach((record, entryId) => {
      if (!liveEntryIds.has(entryId)) {
        record.marker.remove();
        entryMarkersRef.current.delete(entryId);
      }
    });
    liveEntries.forEach((entry) => {
      const status = toOperationalStatus(entry.route_state !== "staged" ? entry.route_state : entry.check_in_status);
      let record = entryMarkersRef.current.get(entry.id);
      if (!record) {
        const markerEl = document.createElement("div");
        const popup = new mapboxgl.Popup({ offset: 25 });
        const marker = new mapboxgl.Marker(markerEl).setLngLat([entry.gps_lng!, entry.gps_lat!]).setPopup(popup).addTo(map);
        record = { marker, markerEl, popup, latitude: entry.gps_lat!, longitude: entry.gps_lng! };
        entryMarkersRef.current.set(entry.id, record);
      }
      applyMarkerStatusClasses(record.markerEl, status);
      record.markerEl.textContent = entry.parade_number ? String(entry.parade_number) : "•";
      record.popup.setHTML(buildEntryPopup(entry));
      record.marker.setLngLat([entry.gps_lng!, entry.gps_lat!]);
    });
  }, [spots, editBasePath]);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainer.current;
    if (!map || !container) return;
    map.resize();
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fillHeight]);

  return (
    <div className={["overflow-hidden rounded-3xl border border-slate-800 bg-slate-950", fillHeight ? "h-full min-h-0" : ""].join(" ")}>
      <style jsx global>{`
        .mapboxgl-popup-content { background: #020617 !important; color: white !important; border: 1px solid #1e293b !important; border-radius: 16px !important; }
        .mapboxgl-popup-tip { border-top-color: #020617 !important; border-bottom-color: #020617 !important; }
      `}</style>
      <div ref={mapContainer} className={fillHeight ? "h-full min-h-0 w-full" : "h-full min-h-[520px] w-full"} />
    </div>
  );
}
