"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { updateStagingSpotPosition } from "@/app/organizations/[slug]/parades/[eventId]/staging/actions";

type StagingLayoutSpot = {
  id: string;
  spot_code: string;
  section: string | null;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_feet: number;
  entries?: { name: string }[] | null;
};

type StagingLayoutEditorProps = {
  eventId: string;
  spots: StagingLayoutSpot[];
  editBasePath: string;
};

type MarkerRecord = {
  marker: mapboxgl.Marker;
  previousPosition: mapboxgl.LngLat | null;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

type CoordinateOverride = { latitude: number; longitude: number };

type GeofenceFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { spotId: string; selected: boolean };
    geometry: { type: "Polygon"; coordinates: number[][][] };
  }>;
};

const GEOFENCE_SOURCE_ID = "staging-layout-geofences";
const GEOFENCE_FILL_LAYER_ID = "staging-layout-geofences-fill";
const GEOFENCE_OUTLINE_LAYER_ID = "staging-layout-geofences-outline";
const FEET_TO_METERS = 0.3048;
const EARTH_RADIUS_METERS = 6_371_008.8;

function circleCoordinates(latitude: number, longitude: number, radiusFeet: number) {
  const radiusMeters = Math.max(0, radiusFeet) * FEET_TO_METERS;
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const points: number[][] = [];

  for (let index = 0; index <= 64; index += 1) {
    const bearing = (index / 64) * Math.PI * 2;
    const pointLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLongitude =
      (longitude * Math.PI) / 180 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
        Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(pointLatitude)
      );

    points.push([(pointLongitude * 180) / Math.PI, (pointLatitude * 180) / Math.PI]);
  }

  return points;
}

function buildGeofenceData(
  spots: StagingLayoutSpot[],
  overrides: Record<string, CoordinateOverride>,
  selectedSpotId: string | null
): GeofenceFeatureCollection {
  return {
    type: "FeatureCollection",
    features: spots.flatMap((spot) => {
      const coordinates = overrides[spot.id] ??
        (spot.latitude !== null && spot.longitude !== null
          ? { latitude: spot.latitude, longitude: spot.longitude }
          : null);

      if (!coordinates) return [];

      return [{
        type: "Feature" as const,
        properties: { spotId: spot.id, selected: spot.id === selectedSpotId },
        geometry: {
          type: "Polygon" as const,
          coordinates: [circleCoordinates(
            coordinates.latitude,
            coordinates.longitude,
            spot.geofence_radius_feet
          )],
        },
      }];
    }),
  };
}

function buildPopupContent(spot: StagingLayoutSpot, editBasePath: string) {
  const container = document.createElement("div");
  container.style.minWidth = "220px";

  const title = document.createElement("strong");
  title.style.fontSize = "16px";
  title.textContent = spot.spot_code;
  container.appendChild(title);

  const details = document.createElement("div");
  details.style.marginTop = "8px";
  const assignedEntry = Array.isArray(spot.entries) ? spot.entries[0] : null;
  details.textContent = `${spot.section || "No section"} · ${spot.street_name || "No street"}`;
  container.appendChild(details);

  const assigned = document.createElement("div");
  assigned.style.marginTop = "8px";
  assigned.textContent = `Assigned: ${assignedEntry?.name || "Empty spot"}`;
  container.appendChild(assigned);

  const editLink = document.createElement("a");
  editLink.href = `${editBasePath}/${spot.id}/edit`;
  editLink.style.display = "inline-block";
  editLink.style.marginTop = "12px";
  editLink.style.color = "#60a5fa";
  editLink.style.fontWeight = "700";
  editLink.textContent = "Edit or delete spot";
  container.appendChild(editLink);

  return container;
}

export function StagingLayoutEditor({ eventId, spots, editBasePath }: StagingLayoutEditorProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRecordsRef = useRef(new Map<string, MarkerRecord>());
  const initialSpotsRef = useRef(spots);
  const [savingSpotId, setSavingSpotId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [coordinateOverrides, setCoordinateOverrides] = useState<Record<string, CoordinateOverride>>({});
  const [geofenceLayersReady, setGeofenceLayersReady] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = mapContainerRef.current;
    if (!container || !token || mapRef.current) return;

    const locatedSpots = initialSpotsRef.current.filter(
      (spot) => spot.latitude !== null && spot.longitude !== null
    );
    const center: [number, number] = locatedSpots.length > 0
      ? [locatedSpots[0].longitude!, locatedSpots[0].latitude!]
      : [-98.4936, 29.4241];

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: locatedSpots.length > 0 ? 16 : 12,
    });
    const markerRecords = markerRecordsRef.current;

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.once("load", () => {
      map.addSource(GEOFENCE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: GEOFENCE_FILL_LAYER_ID,
        type: "fill",
        source: GEOFENCE_SOURCE_ID,
        paint: {
          "fill-color": ["case", ["boolean", ["get", "selected"], false], "#3b82f6", "#38bdf8"],
          "fill-opacity": ["case", ["boolean", ["get", "selected"], false], 0.2, 0.09],
        },
      });
      map.addLayer({
        id: GEOFENCE_OUTLINE_LAYER_ID,
        type: "line",
        source: GEOFENCE_SOURCE_ID,
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#93c5fd", "#38bdf8"],
          "line-opacity": ["case", ["boolean", ["get", "selected"], false], 0.95, 0.55],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 3, 1.5],
        },
      });
      setGeofenceLayersReady(true);
    });

    locatedSpots.forEach((spot) => {
      const markerElement = document.createElement("div");
      markerElement.classList.add(
        "flex", "h-11", "w-11", "cursor-grab", "items-center", "justify-center",
        "rounded-full", "border-2", "border-blue-200", "bg-blue-600", "text-xs",
        "font-bold", "text-white", "shadow-lg", "active:cursor-grabbing"
      );
      markerElement.textContent = spot.spot_code;
      markerElement.addEventListener("click", () => setSelectedSpotId(spot.id));

      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(
        buildPopupContent(spot, editBasePath)
      );
      const record: MarkerRecord = {
        marker: new mapboxgl.Marker({ element: markerElement, draggable: true })
          .setLngLat([spot.longitude!, spot.latitude!])
          .setPopup(popup)
          .addTo(map),
        previousPosition: null,
      };

      record.marker.on("dragstart", () => {
        record.previousPosition = record.marker.getLngLat();
        setSelectedSpotId(spot.id);
        setFeedback(null);
      });
      record.marker.on("drag", () => {
        const position = record.marker.getLngLat();
        setCoordinateOverrides((current) => ({
          ...current,
          [spot.id]: { latitude: position.lat, longitude: position.lng },
        }));
      });
      record.marker.on("dragend", async () => {
        const previousPosition = record.previousPosition;
        const nextPosition = record.marker.getLngLat();
        record.marker.setDraggable(false);
        setSavingSpotId(spot.id);
        setFeedback(null);

        const result = await updateStagingSpotPosition({
          eventId,
          spotId: spot.id,
          latitude: nextPosition.lat,
          longitude: nextPosition.lng,
        }).catch(() => ({ ok: false as const, error: "Unable to save the staging spot location." }));

        record.marker.setDraggable(true);
        setSavingSpotId(null);

        if (!result.ok) {
          if (previousPosition) {
            record.marker.setLngLat(previousPosition);
            setCoordinateOverrides((current) => ({
              ...current,
              [spot.id]: { latitude: previousPosition.lat, longitude: previousPosition.lng },
            }));
          }
          setFeedback({ tone: "error", message: `${spot.spot_code}: ${result.error}` });
          return;
        }

        record.marker.setLngLat([result.longitude, result.latitude]);
        setCoordinateOverrides((current) => ({
          ...current,
          [spot.id]: { latitude: result.latitude, longitude: result.longitude },
        }));
        record.previousPosition = null;
        setFeedback({ tone: "success", message: `${spot.spot_code} location saved.` });
        router.refresh();
      });

      markerRecords.set(spot.id, record);
    });

    if (locatedSpots.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locatedSpots.forEach((spot) => bounds.extend([spot.longitude!, spot.latitude!]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
    }

    const resizeMap = () => map.resize();
    resizeMap();
    const observer = new ResizeObserver(resizeMap);
    observer.observe(container);

    return () => {
      observer.disconnect();
      markerRecords.forEach((record) => record.marker.remove());
      markerRecords.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [editBasePath, eventId, router]);

  useEffect(() => {
    if (!geofenceLayersReady) return;
    const source = mapRef.current?.getSource(GEOFENCE_SOURCE_ID);
    if (source?.type === "geojson") {
      source.setData(buildGeofenceData(spots, coordinateOverrides, selectedSpotId));
    }
  }, [coordinateOverrides, geofenceLayersReady, selectedSpotId, spots]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <div ref={mapContainerRef} className="h-[560px] min-h-[420px] w-full" />
      <div className="flex min-h-12 items-center justify-between gap-4 border-t border-slate-800 px-4 py-3 text-sm">
        <p className="text-slate-400">Drag a marker to update an existing staging spot.</p>
        {savingSpotId ? <p className="font-semibold text-blue-300">Saving location…</p> : null}
        {!savingSpotId && feedback ? (
          <p className={feedback.tone === "success" ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
