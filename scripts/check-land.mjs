#!/usr/bin/env node
/**
 * Geometric check: no route path may run over land.
 *
 *   npm run check:land
 *
 * Samples every smoothed path (exactly as the map draws it) at 0.15° intervals
 * and tests it against Natural Earth 50 m land polygons.
 *
 * Some genuinely navigable passages are narrower than the dataset's resolution
 * (the Suez and Panama canals, the Dover Strait, the Danish Straits, the
 * Singapore Strait, the Dardanelles, the Paraná channel…). They are declared in
 * ALLOWED below: the script counts them separately instead of flagging them.
 *
 * Exits 1 if any land crossing remains outside those zones.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dataset } from './lib/dataset.mjs';
import { smoothPath } from '../src/lib/geo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { ROUTES } = dataset;
const CACHE = path.join(HERE, '.cache');
const LAND_FILE = path.join(CACHE, 'ne_50m_land.json');
const LAND_URL =
  'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/physical/ne_50m_land.json';

const STEP = 0.15; // sampling step, in degrees
const PORT_RADIUS = 0.6; // tolerance around endpoints: ports are coastal

/**
 * Navigable passages not resolved by Natural Earth 50 m.
 * [latMin, latMax, lngMin, lngMax, label]
 */
const ALLOWED = [
  [29.3, 31.7, 31.6, 33.0, 'Suez Canal'],
  [8.8, 9.5, -80.1, -79.4, 'Panama Canal'],
  [50.6, 51.3, 0.3, 2.3, 'Dover Strait'],
  [54.7, 58.0, 9.6, 13.0, 'Danish Straits (Great Belt, Kattegat, Skagen)'],
  [0.9, 1.6, 103.1, 104.7, 'Singapore Strait'],
  [40.0, 41.5, 25.9, 29.4, 'Dardanelles, Marmara and Bosporus'],
  [-34.8, -32.7, -61.0, -57.4, 'Paraná channel (river navigation)'],
  [4.4, 8.2, 116.6, 120.0, 'Sulu Sea: Sibutu and Balabac passages'],
  [70.8, 74.2, 68.5, 75.5, 'Gulf of Ob (Sabetta)'],
  [12.2, 13.1, 42.9, 44.0, 'Bab el-Mandeb'],
  [21.8, 23.1, 68.5, 70.3, 'Gulf of Kutch (Vadinar, Mundra)'],
  [25.9, 27.0, 55.7, 57.0, 'Strait of Hormuz'],
  [-6.9, -5.3, 104.6, 106.3, 'Sunda Strait'],
  [-9.2, -8.2, 115.3, 116.3, 'Lombok Strait'],
  [1.0, 6.2, 94.5, 100.0, 'Northern entrance of the Malacca Strait'],
  [69.9, 71.0, 55.8, 60.2, 'Kara Gate'],
  [64.8, 66.6, 189.8, 192.0, 'Bering Strait'],
  [-11.4, -10.2, 141.6, 143.9, 'Torres Strait (Prince of Wales Channel)'],
];

const inAllowed = (lat, lng) => {
  const x = ((((lng + 180) % 360) + 360) % 360) - 180;
  for (const [latMin, latMax, lngMin, lngMax, label] of ALLOWED) {
    // Longitude bounds are given either in [-180,180] or continuously.
    const lo = ((((lngMin + 180) % 360) + 360) % 360) - 180;
    const hi = ((((lngMax + 180) % 360) + 360) % 360) - 180;
    const lngOk = lo <= hi ? x >= lo && x <= hi : x >= lo || x <= hi;
    if (lat >= latMin && lat <= latMax && lngOk) return label;
  }
  return null;
};

async function loadLand() {
  if (!fs.existsSync(LAND_FILE)) {
    process.stdout.write('Downloading Natural Earth 50 m polygons… ');
    const res = await fetch(LAND_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${LAND_URL}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(LAND_FILE, Buffer.from(await res.arrayBuffer()));
    console.log('done.');
  }
  return JSON.parse(fs.readFileSync(LAND_FILE, 'utf8'));
}

function buildIndex(land) {
  const polys = [];
  for (const f of land.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
  }
  return polys.map((rings) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of rings[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { rings, minX, minY, maxX, maxY };
  });
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function makeOnLand(index) {
  return (lat, lng) => {
    const x = ((((lng + 180) % 360) + 360) % 360) - 180;
    for (const p of index) {
      if (x < p.minX || x > p.maxX || lat < p.minY || lat > p.maxY) continue;
      if (!inRing(x, lat, p.rings[0])) continue;
      let inHole = false;
      for (let k = 1; k < p.rings.length; k += 1) {
        if (inRing(x, lat, p.rings[k])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  };
}

const land = await loadLand();
const onLand = makeOnLand(buildIndex(land));

const failures = [];
const waived = new Map();

for (const route of ROUTES) {
  const pts = smoothPath(route.path, 2);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const hits = [];

  for (let i = 0; i < pts.length - 1; i += 1) {
    const [lat1, lng1] = pts[i];
    const [lat2, lng2] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(lat2 - lat1, lng2 - lng1) / STEP));
    for (let s = 0; s <= n; s += 1) {
      const t = s / n;
      const lat = lat1 + (lat2 - lat1) * t;
      const lng = lng1 + (lng2 - lng1) * t;
      if (
        Math.hypot(lat - first[0], lng - first[1]) < PORT_RADIUS ||
        Math.hypot(lat - last[0], lng - last[1]) < PORT_RADIUS
      ) continue;
      if (!onLand(lat, lng)) continue;

      const label = inAllowed(lat, lng);
      if (label) waived.set(label, (waived.get(label) ?? 0) + 1);
      else hits.push([+lat.toFixed(2), +lng.toFixed(2)]);
    }
  }

  if (hits.length) failures.push({ route, hits });
}

console.log(`\nLand/sea check — ${ROUTES.length} routes, Natural Earth 50 m, ${STEP}° step\n`);

if (waived.size) {
  console.log('Narrow passages allowed (finer than the basemap resolution):');
  for (const [label, n] of [...waived].sort((a, b) => b[1] - a[1])) {
    console.log(`  · ${label} — ${n} samples`);
  }
  console.log('');
}

if (!failures.length) {
  console.log('✅ No path crosses land outside the allowed passages.\n');
  process.exit(0);
}

for (const { route, hits } of failures) {
  console.log(`❌ ${route.id} — ${route.name}`);
  const mid = hits[Math.floor(hits.length / 2)];
  console.log(`     ${hits.length} samples, around ${mid[0]}, ${mid[1]}`);
}
console.log(`\n${failures.length} route(s) need fixing.\n`);
process.exit(1);
