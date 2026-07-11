"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { CheckpointType, saveCheckpoint, saveRouteSettings } from "@/app/organizations/[slug]/parades/[eventId]/route/actions";

type Checkpoint = { id: string; name: string; checkpoint_type: CheckpointType; latitude: number; longitude: number; geofence_radius_feet: number; sort_order: number };
type Props = { eventId: string; routeGeometry: unknown; initialCorridorWidthFeet: number; initialCheckpoints: Checkpoint[] };
type Draft = { id?: string; name: string; checkpointType: CheckpointType; latitude: string; longitude: string; radius: string; sortOrder: string };
const emptyDraft: Draft = { name: "", checkpointType: "intermediate", latitude: "", longitude: "", radius: "100", sortOrder: "0" };

function markerLabel(type: CheckpointType) {
  return type === "route_start" ? "S" : type === "route_finish" ? "F" : type === "dispersal_exit" ? "D" : "•";
}

export function RouteOperationsEditor({ eventId, routeGeometry, initialCorridorWidthFeet, initialCheckpoints }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef(new Map<string, mapboxgl.Marker>());
  const checkpointsRef = useRef(initialCheckpoints);
  const [checkpoints, setCheckpoints] = useState(initialCheckpoints);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [corridor, setCorridor] = useState(String(initialCorridorWidthFeet));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkpointsRef.current = checkpoints; }, [checkpoints]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = containerRef.current;
    if (!token || !container || mapRef.current) return;
    const first = checkpointsRef.current[0];
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container, style: "mapbox://styles/mapbox/dark-v11", center: first ? [first.longitude, first.latitude] : [-98.4936, 29.4241], zoom: first ? 14 : 11 });
    const markerRecords = markersRef.current;
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("click", ({ lngLat }) => setDraft((current) => ({ ...current, latitude: lngLat.lat.toFixed(6), longitude: lngLat.lng.toFixed(6) })));
    map.once("load", () => {
      if (routeGeometry && typeof routeGeometry === "object") {
        map.addSource("parade-route", { type: "geojson", data: routeGeometry as mapboxgl.GeoJSONSourceSpecification["data"] });
        map.addLayer({ id: "parade-route-line", type: "line", source: "parade-route", paint: { "line-color": "#38bdf8", "line-width": 5, "line-opacity": 0.8 } });
      }
      map.resize();
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => { observer.disconnect(); markerRecords.clear(); map.remove(); mapRef.current = null; };
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const liveIds = new Set(checkpoints.map((checkpoint) => checkpoint.id));
    for (const [id, marker] of markersRef.current) if (!liveIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    for (const checkpoint of checkpoints) {
      let marker = markersRef.current.get(checkpoint.id);
      if (!marker) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sky-600 font-bold text-white shadow-lg";
        marker = new mapboxgl.Marker({ element }).setLngLat([checkpoint.longitude, checkpoint.latitude]).addTo(map);
        element.addEventListener("click", (event) => { event.stopPropagation(); const current = checkpointsRef.current.find((item) => item.id === checkpoint.id); if (current) setDraft({ id: current.id, name: current.name, checkpointType: current.checkpoint_type, latitude: String(current.latitude), longitude: String(current.longitude), radius: String(current.geofence_radius_feet), sortOrder: String(current.sort_order) }); });
        markersRef.current.set(checkpoint.id, marker);
      }
      marker.getElement().textContent = markerLabel(checkpoint.checkpoint_type);
      const position = marker.getLngLat();
      if (position.lng !== checkpoint.longitude || position.lat !== checkpoint.latitude) marker.setLngLat([checkpoint.longitude, checkpoint.latitude]);
    }
  }, [checkpoints]);

  async function submitCheckpoint(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const result = await saveCheckpoint({ eventId, checkpointId: draft.id, name: draft.name, checkpointType: draft.checkpointType, latitude: Number(draft.latitude), longitude: Number(draft.longitude), geofenceRadiusFeet: Number(draft.radius), sortOrder: Number(draft.sortOrder) });
    setSaving(false);
    if (!result.ok) { setMessage(result.error); return; }
    setCheckpoints((current) => [...current.filter((item) => item.id !== result.checkpoint.id), result.checkpoint as Checkpoint].sort((a, b) => a.sort_order - b.sort_order));
    setDraft(emptyDraft); setMessage("Checkpoint saved.");
  }

  async function submitSettings(event: React.FormEvent) {
    event.preventDefault(); const result = await saveRouteSettings({ eventId, corridorWidthFeet: Number(corridor) }); setMessage(result.ok ? "Route settings saved." : result.error);
  }

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return <div className="rounded-xl border border-amber-700 bg-amber-950 p-4 text-amber-200">Mapbox is unavailable. Add NEXT_PUBLIC_MAPBOX_TOKEN to use route setup.</div>;

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
    <div ref={containerRef} className="min-h-[520px] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900" />
    <div className="space-y-5">
      <form onSubmit={submitSettings} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="block text-sm font-semibold text-white">Route corridor width (feet)<input type="number" min="1" value={corridor} onChange={(event) => setCorridor(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /></label>
        <button className="mt-3 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white">Save corridor</button>
      </form>
      <form onSubmit={submitCheckpoint} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold text-white">{draft.id ? "Edit checkpoint" : "Place checkpoint"}</h2>
        <p className="text-sm text-slate-400">Click the map to set coordinates, then complete the checkpoint details.</p>
        <input required placeholder="Checkpoint name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        <select value={draft.checkpointType} onChange={(event) => setDraft({ ...draft, checkpointType: event.target.value as CheckpointType })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><option value="route_start">Route start</option><option value="intermediate">Intermediate</option><option value="route_finish">Route finish</option><option value="dispersal_exit">Dispersal exit</option></select>
        <div className="grid grid-cols-2 gap-3"><input required type="number" step="any" placeholder="Latitude" value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /><input required type="number" step="any" placeholder="Longitude" value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm text-slate-300">Radius (feet)<input required type="number" min="1" value={draft.radius} onChange={(event) => setDraft({ ...draft, radius: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /></label><label className="text-sm text-slate-300">Sort order<input required type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /></label></div>
        <div className="flex gap-3"><button disabled={saving} className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save checkpoint"}</button>{draft.id && <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-xl border border-slate-700 px-4 py-2">New checkpoint</button>}</div>
        {message && <p role="status" className="text-sm text-sky-300">{message}</p>}
      </form>
    </div>
  </div>;
}
