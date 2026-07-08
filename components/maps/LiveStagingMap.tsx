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
  fillHeight?: boolean;
};

function formatStatus(status: string | null | undefined) {
  if (!status) return "Not checked in";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toOperationalStatus(
  status: string | null | undefined
): "ready" | "getting_ready" | "needs_assistance" | "not_checked_in" {
  if (!status) {
    return "not_checked_in";
  }

  if (status === "ready" || status === "checked_in") {
    return "ready";
  }

  if (status === "getting_ready" || status === "staging" || status === "queued") {
    return "getting_ready";
  }

  if (status === "needs_assistance") {
    return "needs_assistance";
  }

  return "not_checked_in";
}

function highlightSpotCard(spotId: string) {
  const card = document.getElementById(`spot-${spotId}`);

  if (!card) return;

  card.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  card.classList.add("ring-2", "ring-blue-500", "bg-slate-900");

  window.setTimeout(() => {
    card.classList.remove("ring-2", "ring-blue-500", "bg-slate-900");
  }, 2500);
}

export function LiveStagingMap({
  spots,
  editBasePath,
  fillHeight = false,
}: LiveStagingMapProps) {
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

    if (validSpots.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();

      validSpots.forEach((spot) => {
        bounds.extend([spot.longitude!, spot.latitude!]);
      });

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 17,
      });
    }

    validSpots.forEach((spot) => {
      const assignedEntry = Array.isArray(spot.entries)
        ? spot.entries[0]
        : null;
      const operationalStatus = toOperationalStatus(assignedEntry?.check_in_status);

      const markerEl = document.createElement("div");
      markerEl.className = [
        "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition-transform",
        operationalStatus === "ready"
          ? "border-green-200 bg-green-600"
          : operationalStatus === "getting_ready"
            ? "border-yellow-200 bg-yellow-600"
            : operationalStatus === "needs_assistance"
              ? "h-12 w-12 border-red-100 bg-red-600 ring-4 ring-red-500/60"
              : "border-slate-200 bg-slate-600",
      ].join(" ");
      markerEl.textContent = spot.spot_code;

      markerEl.addEventListener("click", () => {
        highlightSpotCard(spot.id);
      });

      const editHref = editBasePath ? `${editBasePath}/${spot.id}/edit` : "#";

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
                  ? `<a href="${editHref}" style="display:inline-block;margin-top:12px;color:#60a5fa;font-weight:700;">Edit Spot</a>`
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

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainer.current;

    if (!map || !container) {
      return;
    }

    const resizeMap = () => {
      map.resize();
    };

    resizeMap();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        resizeMap();
      });
      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", resizeMap);

    return () => {
      window.removeEventListener("resize", resizeMap);
    };
  }, [spots, editBasePath, fillHeight]);

  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-slate-800 bg-slate-950",
        fillHeight ? "h-full min-h-0" : "",
      ].join(" ")}
    >
      <style jsx global>{`
        .mapboxgl-popup-content {
          background: #020617 !important;
          color: white !important;
          border: 1px solid #1e293b !important;
          border-radius: 16px !important;
        }

        .mapboxgl-popup-tip {
          border-top-color: #020617 !important;
          border-bottom-color: #020617 !important;
        }
      `}</style>

      <div
        ref={mapContainer}
        className={fillHeight ? "h-full min-h-0 w-full" : "h-full min-h-[520px] w-full"}
      />
    </div>
  );
}
