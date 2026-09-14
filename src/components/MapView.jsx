import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ROUTES, CHOKEPOINTS, PIPELINES } from '../data/index.js';
import { COMMODITY_BY_ID, STATUS } from '../data/commodities.js';
import { smoothPath, pathVariants, wrapLng } from '../lib/geo.js';

/**
 * CARTO basemap key.
 *
 * Set `VITE_CARTO_KEY` at build time (see `.env.example`). Without it the tiles
 * still load, but CARTO stamps a repeated "API key required" watermark across
 * the map — fine locally, not on a public site. The key is free, takes a minute
 * and needs no account: https://carto.com/basemaps/apikey
 *
 * Publishing it in the bundle is expected: basemap keys are public by design and
 * are restricted by domain on CARTO's side, not by secrecy.
 */
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY ?? '';
const KEY_PARAM = CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : '';

const BASEMAP = `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png${KEY_PARAM}`;
const BASEMAP_LABELS = `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png${KEY_PARAM}`;
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Line thickness from the corridor's rank (1 to 5). */
const strokeWidth = (weight) => 1.1 + weight * 0.75;

/** Light casing laid under every path: lifts the line off the basemap. */
const CASING = '#ffffff';

/**
 * Cartographic generalisation: past this many visible corridors, the lightest
 * ones stay hidden until the user zooms in. A printed atlas does the same — you
 * do not show secondary routes on a world map.
 */
const GENERALIZE_ABOVE = 20;

const minWeightForZoom = (zoom) => {
  if (zoom <= 3) return 4;
  if (zoom === 4) return 3;
  if (zoom === 5) return 2;
  return 1;
};

/** Strait names overlap at world scale. */
const LABEL_MIN_ZOOM = 4;

export default function MapView({
  visibleIds,
  selectedRouteId,
  onSelectRoute,
  hoveredRouteId,
  selectedChokepointId,
  onSelectChokepoint,
  showChokepoints,
  showBypass,
  showLabels,
  declutter,
  onRenderStats,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Bumped on every (re)creation of the map: under StrictMode the mount effect
  // runs twice, and the layers have to be rebuilt.
  const [mapEpoch, setMapEpoch] = useState(0);
  const [zoom, setZoom] = useState(3);
  const layersRef = useRef({
    routes: null,
    chokepoints: null,
    bypass: null,
    labels: null,
    byRoute: new Map(),
  });

  // --- Map initialisation -------------------------------------------
  useEffect(() => {
    if (mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [22, 40],
      zoom: 3,
      minZoom: 2,
      maxZoom: 9,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(BASEMAP, { attribution: ATTRIBUTION, subdomains: 'abcd' }).addTo(
      map
    );

    map.createPane('wm-labels');
    map.getPane('wm-labels').style.zIndex = 250;
    map.getPane('wm-labels').style.pointerEvents = 'none';

    const labels = L.tileLayer(BASEMAP_LABELS, {
      subdomains: 'abcd',
      opacity: 0.9,
      pane: 'wm-labels',
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layers = layersRef.current;
    layers.labels = labels;
    layers.bypass = L.layerGroup().addTo(map);
    layers.routes = L.layerGroup().addTo(map);
    layers.chokepoints = L.layerGroup().addTo(map);

    map.on('zoomend', () => setZoom(map.getZoom()));

    mapRef.current = map;
    setMapEpoch((n) => n + 1);
    setZoom(map.getZoom());

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Place-name layer ---------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const { labels } = layersRef.current;
    if (!map || !labels) return;
    if (showLabels) labels.addTo(map);
    else labels.remove();
  }, [showLabels, mapEpoch]);

  // --- Bypass pipelines --------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current.bypass;
    if (!map || !group) return;
    group.clearLayers();
    if (!showBypass) return;

    PIPELINES.forEach((pipe) => {
      L.polyline(pipe.path, {
        color: CASING,
        weight: 5,
        opacity: 0.85,
        interactive: false,
      }).addTo(group);

      const line = L.polyline(pipe.path, {
        color: '#6f6a60',
        weight: 2,
        dashArray: '1 5',
        lineCap: 'round',
      });
      line.bindTooltip(
        `<span class="tt-kicker">Pipeline — Hormuz bypass</span>
         <strong>${pipe.name}</strong>
         <span class="tt-label">2025 reference</span>
         <span class="tt-metric">${pipe.leadFact?.statement ?? ''}</span>
         ${pipe.situation ? `<span class="tt-label tt-label--now">Now</span><span class="tt-metric">${pipe.situation}</span>` : ''}`,
        { className: 'wm-tooltip', sticky: true }
      );
      line.addTo(group);
    });
  }, [showBypass, mapEpoch]);

  // --- Routes -----------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current.routes;
    if (!map || !group) return;

    group.clearLayers();
    layersRef.current.byRoute = new Map();

    const eligible = ROUTES.filter((r) => visibleIds.has(r.id));
    const threshold =
      declutter && eligible.length > GENERALIZE_ABOVE
        ? minWeightForZoom(zoom)
        : 1;
    const visible = eligible.filter((r) => r.weight >= threshold);

    onRenderStats?.(visible.length, eligible.length);

    // The selection is drawn last; otherwise lightest to heaviest.
    const ordered = [...visible].sort((a, b) => {
      if (a.id === selectedRouteId) return 1;
      if (b.id === selectedRouteId) return -1;
      return a.weight - b.weight;
    });

    const prepared = ordered.map((route) => ({
      route,
      variants: pathVariants(smoothPath(route.path, 2)),
      isSelected: route.id === selectedRouteId,
      dimmed: Boolean(selectedRouteId) && route.id !== selectedRouteId,
    }));

    // Three passes: every casing, then every line, then the endpoints. Otherwise
    // one route's casing would paint over its neighbour's line.
    prepared.forEach(({ route, variants, isSelected, dimmed }) => {
      const w = strokeWidth(route.weight) * (isSelected ? 1.5 : 1);
      variants.forEach((coords) => {
        L.polyline(coords, {
          color: CASING,
          weight: w + 3,
          opacity: dimmed ? 0.35 : 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(group);
      });
    });

    prepared.forEach(({ route, variants, isSelected, dimmed }) => {
      const commodity = COMMODITY_BY_ID[route.commodity];
      const status = STATUS[route.status];
      const w = strokeWidth(route.weight) * (isSelected ? 1.5 : 1);
      const lines = [];

      variants.forEach((coords) => {
        const line = L.polyline(coords, {
          color: commodity.color,
          weight: w,
          opacity: dimmed ? 0.22 : 1,
          dashArray: status.dash ?? undefined,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
          className: isSelected ? 'wm-route wm-route--selected' : 'wm-route',
        }).addTo(group);
        lines.push(line);

        const hit = L.polyline(coords, {
          color: '#000000',
          weight: 16,
          opacity: 0,
          bubblingMouseEvents: false,
        });
        hit.bindTooltip(
          `<span class="tt-kicker" style="color:${commodity.color}">${commodity.label}</span>
           <strong>${route.name}</strong>
           <span class="tt-label">2025 reference</span>
           <span class="tt-metric">${route.leadFact?.statement ?? ''}</span>
           <span class="tt-label tt-label--now">Now</span>
           <span class="tt-status" style="color:${status.color}">${status.icon} ${status.label}</span>`,
          { className: 'wm-tooltip', sticky: true }
        );
        hit.on('click', () => onSelectRoute(route.id));
        hit.on('mouseover', () => {
          if (!dimmed) line.setStyle({ weight: w * 1.7 });
        });
        hit.on('mouseout', () => line.setStyle({ weight: w }));
        hit.addTo(group);
      });

      layersRef.current.byRoute.set(route.id, { lines, baseWeight: w });
    });

    prepared.forEach(({ route, variants, isSelected, dimmed }) => {
      const commodity = COMMODITY_BY_ID[route.commodity];
      const o = dimmed ? 0.25 : 1;
      variants.forEach((coords) => {
        L.circleMarker(coords[0], {
          radius: isSelected ? 5 : 3.5,
          color: commodity.color,
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: o,
          opacity: o,
          interactive: false,
        }).addTo(group);

        L.circleMarker(coords[coords.length - 1], {
          radius: isSelected ? 5.5 : 4,
          color: '#ffffff',
          weight: 1.5,
          fillColor: commodity.color,
          fillOpacity: o,
          opacity: o,
          interactive: false,
        }).addTo(group);
      });
    });
  }, [
    visibleIds,
    selectedRouteId,
    onSelectRoute,
    onRenderStats,
    declutter,
    zoom,
    mapEpoch,
  ]);

  // --- Hover from the side list ----------------------------------------
  useEffect(() => {
    for (const [id, entry] of layersRef.current.byRoute) {
      const on = id === hoveredRouteId;
      entry.lines.forEach((l) =>
        l.setStyle({ weight: on ? entry.baseWeight * 1.9 : entry.baseWeight })
      );
    }
  }, [hoveredRouteId, visibleIds, selectedRouteId, declutter, zoom, mapEpoch]);

  // --- Chokepoints ------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current.chokepoints;
    if (!map || !group) return;

    group.clearLayers();
    if (!showChokepoints) return;

    CHOKEPOINTS.forEach((cp) => {
      const status = STATUS[cp.status];
      const isSelected = cp.id === selectedChokepointId;
      const pos = [cp.c[0], wrapLng(cp.c[1])];
      const isAlert = cp.status === 'disrupted' || cp.status === 'reduced';

      if (isAlert) {
        L.circleMarker(pos, {
          radius: isSelected ? 18 : 13,
          color: status.color,
          weight: 1,
          opacity: 0.4,
          fillColor: status.color,
          fillOpacity: 0.09,
          interactive: false,
          className: 'wm-choke-halo',
        }).addTo(group);
      }

      const dot = L.circleMarker(pos, {
        radius: isSelected ? 7.5 : 6,
        color: status.color,
        weight: 2.5,
        fillColor: '#ffffff',
        fillOpacity: 1,
        className: 'wm-choke-dot',
      });
      dot.bindTooltip(
        `<span class="tt-kicker">Chokepoint</span>
         <strong>${cp.name}</strong>
         <span class="tt-label">2025 reference</span>
         <span class="tt-metric">${cp.leadFact?.statement ?? ''}</span>
         <span class="tt-label tt-label--now">Now</span>
         <span class="tt-status" style="color:${status.color}">${status.icon} ${status.label}</span>`,
        { className: 'wm-tooltip', sticky: true }
      );
      dot.on('click', () => onSelectChokepoint(cp.id));
      dot.addTo(group);

      if (zoom >= LABEL_MIN_ZOOM || isSelected) {
        L.marker(pos, {
          icon: L.divIcon({
            className: 'wm-choke-label-wrap',
            html: `<span class="wm-choke-label${
              isSelected ? ' is-selected' : ''
            }">${cp.name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [-11, 6],
          }),
          interactive: false,
        }).addTo(group);
      }
    });
  }, [showChokepoints, selectedChokepointId, onSelectChokepoint, zoom, mapEpoch]);

  // --- Fit to selection -----------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRouteId) return;
    const entry = layersRef.current.byRoute.get(selectedRouteId);
    if (!entry?.lines.length) return;
    map.flyToBounds(entry.lines[0].getBounds(), {
      padding: [80, 80],
      duration: 0.7,
      maxZoom: 5,
    });
  }, [selectedRouteId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedChokepointId) return;
    const cp = CHOKEPOINTS.find((c) => c.id === selectedChokepointId);
    if (!cp) return;
    map.flyTo([cp.c[0], wrapLng(cp.c[1])], Math.max(map.getZoom(), 5), {
      duration: 0.7,
    });
  }, [selectedChokepointId]);

  return <div ref={containerRef} className="map-canvas" />;
}
