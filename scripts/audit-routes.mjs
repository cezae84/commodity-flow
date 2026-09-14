#!/usr/bin/env node
/**
 * Dataset audit.
 *
 *   npm run check:data
 *
 * Checks, on the CSV files in data/ and the geometry in src/data/:
 *  1. references — every id used anywhere exists (sources, facts, ports,
 *     chokepoints, pipelines, commodities, statuses, sub-families);
 *  2. evidence — every route, chokepoint and pipeline has at least one fact;
 *     its lead fact applies to it; any status other than "normal" cites a fact;
 *     every fact has a source and a verbatim quote; the checked value and every
 *     other number in the statement appear in the quote; analysis texts and
 *     commodity blurbs carry no figures of their own; every source is cited;
 *  3. geography — a path that declares a strait passes through it, and a path
 *     that passes through one declares it; endpoints sit on the named ports;
 *     voyage lengths are plausible.
 *
 * Exits 1 on any problem. Quotes are matched against the live pages separately,
 * by `npm run check:sources`, because that needs a network connection.
 */
import { dataset } from './lib/dataset.mjs';
import { PORTS } from '../src/data/waypoints.js';
import {
  COMMODITIES,
  COMMODITY_BY_ID,
  STATUS,
  SUBFILTERS,
  SUBFILTER_BY_ID,
} from '../src/data/commodities.js';
import { pathLengthNm } from '../src/lib/geo.js';

const { ROUTES, CHOKEPOINTS, PIPELINES, FACTS, SOURCES, issues } = dataset;

const SCOPES = ['corridor', 'exporter', 'importer', 'chokepoint', 'market', 'status', 'policy', 'infrastructure'];
const KINDS = ['official', 'industry', 'news', 'reference'];

const problems = [...issues];
const note = (id, msg) => problems.push(`${id} — ${msg}`);

// ---------------------------------------------------------------------------
// 1. Identifiers
// ---------------------------------------------------------------------------
const owner = new Map();
const claim = (id, kind) => {
  if (!id) return note(`(${kind})`, 'empty id');
  if (owner.has(id)) note(id, `id used twice (${owner.get(id)} and ${kind})`);
  owner.set(id, kind);
};
ROUTES.forEach((r) => claim(r.id, 'route'));
CHOKEPOINTS.forEach((c) => claim(c.id, 'chokepoint'));
PIPELINES.forEach((p) => claim(p.id, 'pipeline'));
COMMODITIES.forEach((c) => claim(c.id, 'commodity'));

const factIds = new Set();
for (const f of FACTS) {
  if (factIds.has(f.id)) note(f.id, 'duplicate fact id');
  factIds.add(f.id);
}
const sourceIds = new Set();
for (const s of SOURCES) {
  if (sourceIds.has(s.id)) note(s.id, 'duplicate source id');
  sourceIds.add(s.id);
  if (!/^https?:\/\//.test(s.url)) note(s.id, `source url is not a web address: "${s.url}"`);
  if (!KINDS.includes(s.kind)) note(s.id, `source kind must be one of ${KINDS.join(', ')}`);
  if (!s.publisher || !s.title) note(s.id, 'source needs a publisher and a title');
  if (s.published && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s.published)) {
    note(s.id, `published must look like 2026, 2026-03 or 2026-03-03: "${s.published}"`);
  }
}

// ---------------------------------------------------------------------------
// 2. Evidence
// ---------------------------------------------------------------------------
const norm = (t) =>
  (t ?? '')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** Spellings a number may take in a source: 1,111 · 1 111 · 1111 · 108,2 · 108.2 */
const numberForms = (n) => {
  const bare = n.replace(/[ ,]/g, '');
  return new Set([n, bare, n.replace(/,/g, ' '), n.replace(/ /g, ','), n.replace(/\./g, ','), n.replace(/,/g, '.')]);
};
const quoteHasNumber = (quote, n) => {
  const q = norm(quote);
  const compact = q.replace(/(\d)[ ,](?=\d{3}\b)/g, '$1');
  return [...numberForms(n)].some((form) => q.includes(form) || compact.includes(form));
};

/**
 * Numbers in a statement that must be found in the quote. Years, quarters
 * (Q1, H1) and marketing-year suffixes (2025/26) describe the period, which the
 * `period` column and the source date carry, so they are not required.
 */
const statementNumbers = (statement) => {
  const text = norm(statement)
    .replace(/\b(?:19|20)\d{2}(?:\/\d{2})?\b/g, ' ')
    .replace(/\b[QH][1-4]\b/g, ' ')
    .replace(/\bQ[1-4]-Q[1-4]\b/g, ' ');
  return [...text.matchAll(/\d[\d.,]*(?:[ ,]\d{3})*/g)]
    .map((m) => m[0].replace(/[.,]$/, ''))
    .filter(Boolean);
};

/** Periods that can only describe the war: March 2026 onwards. */
const WAR_PERIOD = /2026-(0[3-9]|1[0-2])|\b[HQ][2-4] 2026|2026 [HQ][2-4]|since 2026|\bH1 2026/;

const digitsOutsideYears = (text) => /\d/.test((text ?? '').replace(/\b(?:19|20)\d{2}\b/g, ''));

const targets = new Set(owner.keys());
const citedSources = new Set();

for (const f of FACTS) {
  if (!SCOPES.includes(f.scope)) note(f.id, `scope must be one of ${SCOPES.join(', ')}`);
  if (!f.statement) note(f.id, 'empty statement');
  if (!f.quote) note(f.id, 'empty quote — every fact needs the verbatim sentence it comes from');
  if (!f.appliesTo.length) note(f.id, 'applies_to is empty');
  for (const t of f.appliesTo) if (!targets.has(t)) note(f.id, `applies_to "${t}" is not a route, chokepoint, pipeline or commodity id`);
  if (!['auto', 'manual'].includes(f.verification)) note(f.id, 'verification must be auto or manual');
  if (!['baseline', 'current'].includes(f.rawTimeframe)) {
    note(f.id, 'timeframe must be baseline (2025 reference, before 28 February 2026) or current (since then)');
  }
  if (f.timeframe === 'current' && !/2026/.test(f.period)) note(f.id, 'a current fact needs a 2026 period');
  if (f.timeframe === 'baseline' && WAR_PERIOD.test(f.period)) {
    note(f.id, `period "${f.period}" falls after 28 February 2026 — set timeframe to current`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.checkedOn ?? '')) note(f.id, 'checked_on must be a date (YYYY-MM-DD)');
  if (f.source) citedSources.add(f.sourceId);

  if (f.value) {
    const v = norm(f.value);
    const forms = [...numberForms(v), v];
    if (!forms.some((x) => norm(f.statement).includes(x))) note(f.id, `value "${f.value}" does not appear in the statement`);
    if (!forms.some((x) => norm(f.quote).includes(x)) && !quoteHasNumber(f.quote, v)) {
      note(f.id, `value "${f.value}" does not appear in the quote`);
    }
  }
  for (const n of statementNumbers(f.statement)) {
    if (!quoteHasNumber(f.quote, n)) note(f.id, `the statement says "${n}" but the quote does not`);
  }
}

for (const s of SOURCES) if (!citedSources.has(s.id)) note(s.id, 'source is never cited by a fact');

const checkEvidence = (item, kind) => {
  if (!item.facts.length) note(item.id, `${kind} has no fact (add one in facts.csv with applies_to = ${item.id})`);
  if (!item.leadFact) note(item.id, `${kind} has no lead_fact`);
  else if (item.leadFact.timeframe !== 'baseline') {
    note(item.id, `lead_fact "${item.leadFact.id}" must be a 2025 reference (baseline) fact — war-period facts belong in status_fact or situation`);
  }
  if (!item.baselineFacts.length) note(item.id, `${kind} has no 2025 reference (baseline) fact`);
  if (digitsOutsideYears(item.situation)) {
    note(item.id, 'situation contains a figure — figures belong in facts.csv, with their quote');
  }
  if (item.situation && !item.currentFacts.length && item.statusFact?.timeframe !== 'current') {
    note(item.id, 'situation text has no current fact to back it');
  }
  else if (!item.leadFact.appliesTo.includes(item.id)) {
    note(item.id, `lead_fact "${item.leadFact.id}" does not list ${item.id} in applies_to`);
  }
  if (!item.analysis) note(item.id, 'empty analysis');
  if (digitsOutsideYears(item.analysis)) {
    note(item.id, 'analysis contains a figure — figures belong in facts.csv, with their quote');
  }
  if ('status' in item) {
    if (!STATUS[item.status]) note(item.id, `unknown status "${item.status}"`);
    if (item.status !== 'normal' && !item.statusFact) {
      note(item.id, `status "${item.status}" needs a status_fact`);
    }
  }
};
CHOKEPOINTS.forEach((c) => checkEvidence(c, 'chokepoint'));
PIPELINES.forEach((p) => checkEvidence(p, 'pipeline'));

for (const c of COMMODITIES) {
  if (digitsOutsideYears(c.blurb)) note(c.id, 'commodity blurb contains a figure');
}

// ---------------------------------------------------------------------------
// 3. Routes: integrity and geography
// ---------------------------------------------------------------------------
/** Detection radius around a chokepoint, in degrees. */
const NEAR = {
  hormuz: 2.2,
  malacca: 3.5,
  suez: 2.0,
  babElMandeb: 2.0,
  goodHope: 4.0,
  panama: 1.6,
  turkishStraits: 2.0,
  danishStraits: 2.2,
  lombok: 2.0,
  sunda: 2.0,
};

const wrap = (lng) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** Approximate angular distance in degrees, accounting for longitude. */
function angularDist(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  let dLng = wrap(lng1) - wrap(lng2);
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  return Math.hypot(dLat, dLng * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180));
}

/**
 * Radius around the endpoints excluded from detection.
 *
 * A port can sit right next to a strait without the route crossing it — Fujairah
 * is 1.4° from Hormuz precisely because it exists to avoid it. A route's own
 * port therefore never counts as a transit.
 */
const ENDPOINT_EXCLUSION = 1.6;

/** Does the path pass within `radius` degrees of the chokepoint? */
function passesNear(path, cp, radius) {
  const first = path[0];
  const last = path[path.length - 1];
  for (let i = 0; i < path.length - 1; i += 1) {
    const [aLat, aLng] = path[i];
    const [bLat, bLng] = path[i + 1];
    const steps = Math.max(1, Math.ceil(angularDist(aLat, aLng, bLat, bLng) / 0.3));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const lat = aLat + (bLat - aLat) * t;
      const lng = aLng + (bLng - aLng) * t;
      if (
        angularDist(lat, lng, first[0], first[1]) < ENDPOINT_EXCLUSION ||
        angularDist(lat, lng, last[0], last[1]) < ENDPOINT_EXCLUSION
      ) continue;
      if (angularDist(lat, lng, cp.c[0], cp.c[1]) <= radius) return true;
    }
  }
  return false;
}

const CHOKEPOINT_IDS = new Set(CHOKEPOINTS.map((c) => c.id));

for (const r of ROUTES) {
  checkEvidence(r, 'route');
  if (!COMMODITY_BY_ID[r.commodity]) note(r.id, `unknown commodity "${r.commodity}"`);
  if (SUBFILTERS[r.commodity] && !r.sub) note(r.id, 'missing sub-family');
  if (r.sub && !SUBFILTER_BY_ID[r.sub]) note(r.id, `unknown sub-family "${r.sub}"`);
  if (!r.name) note(r.id, 'empty name');
  for (const c of r.chokepoints) if (!CHOKEPOINT_IDS.has(c)) note(r.id, `unknown chokepoint "${c}"`);
  if (!Number.isInteger(r.weight) || r.weight < 1 || r.weight > 5) {
    note(r.id, `weight must be a whole number from 1 to 5, got "${r.weight}"`);
  }
  if (!Array.isArray(r.path) || r.path.length < 3) {
    note(r.id, 'path missing or too short in src/data/geometry.js');
    continue;
  }
  const badPoint = r.path.find(
    (pt) => !Array.isArray(pt) || pt.length !== 2 || !pt.every(Number.isFinite) || Math.abs(pt[0]) > 85
  );
  if (badPoint) note(r.id, `invalid coordinate ${JSON.stringify(badPoint)}`);

  // Declared chokepoints must match the drawn path, both ways.
  const declared = new Set(r.chokepoints);
  for (const cp of CHOKEPOINTS) {
    const radius = NEAR[cp.id];
    if (!radius) continue;
    const actually = passesNear(r.path, cp, radius);
    if (declared.has(cp.id) && !actually) note(r.id, `declares "${cp.name}" but the path does not go through it`);
    if (!declared.has(cp.id) && actually) note(r.id, `passes through "${cp.name}" without declaring it`);
  }

  // Endpoints on the named ports.
  for (const [field, key, idx] of [['from_port', r.fromPort, 0], ['to_port', r.toPort, r.path.length - 1]]) {
    const port = PORTS[key];
    if (!port) continue; // already reported as a broken reference
    const [lat, lng] = r.path[idx];
    const d = angularDist(lat, lng, port.c[0], port.c[1]);
    if (d > 1.5) note(r.id, `${field} "${key}" is ${d.toFixed(1)}° from the end of the drawn path`);
  }

  const nm = pathLengthNm(r.path);
  if (nm < 150) note(r.id, `implausibly short voyage: ${Math.round(nm)} nm`);
  if (nm > 16000) note(r.id, `implausibly long voyage: ${Math.round(nm)} nm`);
}

// ---------------------------------------------------------------------------
const corridorBacked = ROUTES.filter((r) => r.facts.some((f) => f.scope === 'corridor')).length;
console.log(`\nDataset audit — data/*.csv\n`);
console.log(`  routes        ${ROUTES.length} (${corridorBacked} with a corridor-level figure)`);
console.log(`  facts         ${FACTS.length} (${FACTS.filter((f) => f.timeframe === 'baseline').length} reference 2025, ${FACTS.filter((f) => f.timeframe === 'current').length} since the war; ${FACTS.filter((f) => f.verification === 'manual').length} checked by hand)`);
console.log(`  sources       ${SOURCES.length}`);
console.log(`  chokepoints   ${CHOKEPOINTS.length}`);
console.log(`  pipelines     ${PIPELINES.length}`);
console.log(`  ports         ${Object.keys(PORTS).length}`);

if (!problems.length) {
  console.log('\n✅ No inconsistency found.\n');
  process.exit(0);
}
console.log(`\n❌ ${problems.length} problem(s):`);
for (const p of problems) console.log(`   · ${p}`);
console.log('');
process.exit(1);
