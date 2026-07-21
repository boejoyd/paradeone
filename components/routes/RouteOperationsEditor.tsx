"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import {
  type CheckpointType,
  deleteCheckpoint,
  saveCheckpoint,
  saveRouteSettings,
} from "@/app/organizations/[slug]/parades/[eventId]/route/actions";

type Coordinate = [number, number];
type Checkpoint = {
  id: string;
  name: string;
  checkpoint_type: CheckpointType;
  latitude: number;
  longitude: number;
  geofence_radius_feet: number;
  sort_order: number;
};
type Props = {
  eventId: string;
  routeGeometry: unknown;
  initialCorridorWidthFeet: number;
  initialCheckpoints: Checkpoint[];
};
type Draft = {
  id?: string;
  name: string;
  checkpointType: CheckpointType;
  latitude: string;
  longitude: string;
  radius: string;
  sortOrder: string;
};
type EditMode = "route" | "checkpoint";

const emptyDraft: Draft = {
  name: "",
  checkpointType: "intermediate",
  latitude: "",
  longitude: "",
  radius: "100",
  sortOrder: "0",
};

function readRoutePoints(geometry: unknown): Coordinate[] {
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

function routeFeature(points: Coordinate[]) {
  if (points.length < 2) return null;
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: points },
  };
}

function geofenceCollection(checkpoints: Checkpoint[]) {
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
        properties: { id: checkpoint.id, name: checkpoint.name, checkpointType: checkpoint.checkpoint_type },
        geometry: { type: "Polygon" as const, coordinates: [coordinates] },
      };
    }),
  };
}

function markerLabel(checkpoint: Checkpoint) {
  if (checkpoint.checkpoint_type === "route_start") return "S";
  if (checkpoint.checkpoint_type === "route_finish") return "F";
  if (checkpoint.checkpoint_type === "dispersal_exit") return "D";
  if (/announc/i.test(checkpoint.name)) return "A";
  if (/judg|dais/i.test(checkpoint.name)) return "J";
  return "•";
}

export function RouteOperationsEditor({
  eventId,
  routeGeometry,
  initialCorridorWidthFeet,
  initialCheckpoints,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef(new Map<string, mapboxgl.Marker>());
  const checkpointsRef = useRef(initialCheckpoints);
  const routePointsRef = useRef(readRoutePoints(routeGeometry));
  const modeRef = useRef<EditMode>("route");
  const [mode, setMode] = useState<EditMode>("route");
  const [checkpoints, setCheckpoints] = useState(initialCheckpoints);
  const [routePoints, setRoutePoints] = useState<Coordinate[]>(() => readRoutePoints(routeGeometry));
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [corridor, setCorridor] = useState(String(initialCorridorWidthFeet));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);

  useEffect(() => {
    routePointsRef.current = routePoints;
    const source = mapRef.current?.getSource("parade-route") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(routeFeature(routePoints) ?? { type: "FeatureCollection", features: [] });
  }, [routePoints]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = containerRef.current;
    if (!token || !container || mapRef.current) return;
    const firstCheckpoint = checkpointsRef.current[0];
    const firstRoutePoint = routePointsRef.current[0];
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: firstRoutePoint ?? (firstCheckpoint ? [firstCheckpoint.longitude, firstCheckpoint.latitude] : [-98.4936, 29.4241]),
      zoom: firstRoutePoint || firstCheckpoint ? 14 : 11,
    });
    const markerRecords = markersRef.current;
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("click", ({ lngLat }) => {
      if (modeRef.current === "route") {
        setRoutePoints((current) => [...current, [lngLat.lng, lngLat.lat]]);
      } else {
        setDraft((current) => ({
          ...current,
          latitude: lngLat.lat.toFixed(6),
          longitude: lngLat.lng.toFixed(6),
        }));
      }
    });
    map.once("load", () => {
      map.addSource("parade-route", {
        type: "geojson",
        data: routeFeature(routePointsRef.current) ?? { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "parade-route-line",
        type: "line",
        source: "parade-route",
        paint: { "line-color": "#38bdf8", "line-width": 6, "line-opacity": 0.9 },
      });
      map.addSource("checkpoint-geofences", {
        type: "geojson",
        data: geofenceCollection(checkpointsRef.current),
      });
      map.addLayer({
        id: "checkpoint-geofence-fill",
        type: "fill",
        source: "checkpoint-geofences",
        paint: { "fill-color": "#f59e0b", "fill-opacity": 0.16 },
      });
      map.addLayer({
        id: "checkpoint-geofence-line",
        type: "line",
        source: "checkpoint-geofences",
        paint: { "line-color": "#fbbf24", "line-width": 2, "line-opacity": 0.8 },
      });
      map.resize();
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      markerRecords.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("checkpoint-geofences") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(geofenceCollection(checkpoints));
    const liveIds = new Set(checkpoints.map((checkpoint) => checkpoint.id));
    for (const [id, marker] of markersRef.current) {
      if (!liveIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
    for (const checkpoint of checkpoints) {
      let marker = markersRef.current.get(checkpoint.id);
      if (!marker) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sky-600 font-bold text-white shadow-lg";
        marker = new mapboxgl.Marker({ element })
          .setLngLat([checkpoint.longitude, checkpoint.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(`${checkpoint.name} • ${checkpoint.geofence_radius_feet} ft geofence`))
          .addTo(map);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          const current = checkpointsRef.current.find((item) => item.id === checkpoint.id);
          if (current) {
            setMode("checkpoint");
            setDraft({
              id: current.id,
              name: current.name,
              checkpointType: current.checkpoint_type,
              latitude: String(current.latitude),
              longitude: String(current.longitude),
              radius: String(current.geofence_radius_feet),
              sortOrder: String(current.sort_order),
            });
          }
        });
        markersRef.current.set(checkpoint.id, marker);
      }
      marker.getElement().textContent = markerLabel(checkpoint);
      marker.setPopup(new mapboxgl.Popup({ offset: 24 }).setText(`${checkpoint.name} • ${checkpoint.geofence_radius_feet} ft geofence`));
      const position = marker.getLngLat();
      if (position.lng !== checkpoint.longitude || position.lat !== checkpoint.latitude) {
        marker.setLngLat([checkpoint.longitude, checkpoint.latitude]);
      }
    }
  }, [checkpoints]);

  async function submitCheckpoint(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await saveCheckpoint({
      eventId,
      checkpointId: draft.id,
      name: draft.name,
      checkpointType: draft.checkpointType,
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
      geofenceRadiusFeet: Number(draft.radius),
      sortOrder: Number(draft.sortOrder),
    });
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setCheckpoints((current) =>
      [...current.filter((item) => item.id !== result.checkpoint.id), result.checkpoint as Checkpoint].sort(
        (a, b) => a.sort_order - b.sort_order
      )
    );
    setDraft(emptyDraft);
    setMessage("Checkpoint and geofence saved.");
  }

  async function submitRoute(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await saveRouteSettings({
      eventId,
      corridorWidthFeet: Number(corridor),
      routeGeometry: routeFeature(routePoints),
    });
    setSaving(false);
    setMessage(result.ok ? "Route geometry and corridor saved." : result.error);
  }

  async function removeCheckpoint() {
    if (!draft.id) return;
    const confirmed = window.confirm(
      `Delete “${draft.name || "this checkpoint"}”? This cannot be undone.`
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    const checkpointId = draft.id;
    const result = await deleteCheckpoint({ eventId, checkpointId });
    setSaving(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setCheckpoints((current) => current.filter((checkpoint) => checkpoint.id !== checkpointId));
    setDraft(emptyDraft);
    setMessage("Checkpoint deleted.");
  }

  function prepareOperationalCheckpoint(name: string, sortOrder: number) {
    setMode("checkpoint");
    setDraft({ ...emptyDraft, name, radius: "150", sortOrder: String(sortOrder) });
    setMessage(`Click the map to place the ${name} geofence.`);
  }

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return <div className="rounded-xl border border-amber-700 bg-amber-950 p-4 text-amber-200">Mapbox is unavailable. Add NEXT_PUBLIC_MAPBOX_TOKEN to use route setup.</div>;
  }

  const hasStart = checkpoints.some((checkpoint) => checkpoint.checkpoint_type === "route_start");
  const hasFinish = checkpoints.some((checkpoint) => checkpoint.checkpoint_type === "route_finish");
  const hasExit = checkpoints.some((checkpoint) => checkpoint.checkpoint_type === "dispersal_exit");
  const hasAnnouncer = checkpoints.some((checkpoint) => /announc/i.test(checkpoint.name));
  const hasJudges = checkpoints.some((checkpoint) => /judg/i.test(checkpoint.name));

  return (
    <div className="grid gap-6 xl:h-[calc(100dvh-11rem)] xl:min-h-[560px] xl:grid-cols-[minmax(0,1fr)_400px] xl:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3">
          <button type="button" onClick={() => setMode("route")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "route" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>Draw Route</button>
          <button type="button" onClick={() => setMode("checkpoint")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "checkpoint" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>Place Checkpoints</button>
          <span className="self-center text-xs text-slate-400">{mode === "route" ? "Click along the route in travel order." : "Click once to place the selected checkpoint."}</span>
        </div>
        <div ref={containerRef} className="min-h-[560px] w-full flex-1 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 xl:min-h-0" />
      </div>

      <div className="space-y-5 xl:h-full xl:overflow-y-auto xl:pr-1">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">Operational readiness</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>{routePoints.length >= 2 ? "✓" : "○"} Route line</li>
            <li>{hasStart ? "✓" : "○"} Route start geofence</li>
            <li>{hasFinish ? "✓" : "○"} Route finish geofence</li>
            <li>{hasExit ? "✓" : "○"} Dispersal exit geofence</li>
            <li>{hasAnnouncer ? "✓" : "○"} Announcer geofence</li>
            <li>{hasJudges ? "✓" : "○"} Judges/dais geofence</li>
          </ul>
        </section>

        <form onSubmit={submitRoute} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">Route line</h2>
          <p className="mt-1 text-sm text-slate-400">{routePoints.length} mapped point{routePoints.length === 1 ? "" : "s"}</p>
          <label className="mt-3 block text-sm font-semibold text-white">Route corridor width (feet)
            <input type="number" min="1" value={corridor} onChange={(event) => setCorridor(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={saving || routePoints.length === 1} className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{routePoints.length ? "Save Route" : "Remove Saved Route"}</button>
            <button type="button" disabled={!routePoints.length} onClick={() => setRoutePoints((current) => current.slice(0, -1))} className="rounded-xl border border-slate-600 px-4 py-2 text-sm disabled:opacity-50">Undo Point</button>
            <button type="button" disabled={!routePoints.length} onClick={() => setRoutePoints([])} className="rounded-xl border border-red-700 px-4 py-2 text-sm text-red-300 disabled:opacity-50">Clear Route</button>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-white">Quick geofences</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => prepareOperationalCheckpoint("Announcer Dais", 50)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Add Announcer</button>
            <button type="button" onClick={() => prepareOperationalCheckpoint("Judges Dais", 60)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Add Judges</button>
          </div>
        </section>

        <form onSubmit={submitCheckpoint} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold text-white">{draft.id ? "Edit checkpoint" : "Place checkpoint"}</h2>
          <p className="text-sm text-slate-400">Select checkpoint mode, click the map, then save its geofence.</p>
          <input required placeholder="Checkpoint name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
          <select value={draft.checkpointType} onChange={(event) => setDraft({ ...draft, checkpointType: event.target.value as CheckpointType })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="route_start">Route start</option>
            <option value="intermediate">Operational geofence / dais</option>
            <option value="route_finish">Route finish</option>
            <option value="dispersal_exit">Dispersal exit</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" step="any" placeholder="Latitude" value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            <input required type="number" step="any" placeholder="Longitude" value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300">Radius (feet)
              <input required type="number" min="1" value={draft.radius} onChange={(event) => setDraft({ ...draft, radius: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-300">Sort order
              <input required type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button disabled={saving} className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Geofence"}</button>
            {draft.id ? <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-md border border-slate-700 px-4 py-2">New Checkpoint</button> : null}
            {draft.id ? (
              <button
                type="button"
                onClick={() => void removeCheckpoint()}
                disabled={saving}
                className="rounded-md border border-red-700 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-950 disabled:opacity-50"
              >
                Delete Checkpoint
              </button>
            ) : null}
          </div>
          {message ? <p role="status" className="text-sm text-sky-300">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
