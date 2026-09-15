/**
 * Builds the in-memory dataset from the CSV files in data/.
 *
 * Pure function of the raw CSV text: the browser feeds it through Vite `?raw`
 * imports (src/data/index.js), the node scripts read the files from disk
 * (scripts/lib/dataset.mjs). Broken references never throw — they are collected
 * in `issues` so the app still renders while `npm run check:data` fails loudly.
 */
import { parseCsv, splitList } from './csv.js';
import { PORTS, CHOKEPOINT_POSITIONS, PIPELINE_PATHS } from './waypoints.js';
import { ROUTE_PATHS } from './geometry.js';
import { pathLengthNm } from '../lib/geo.js';

export const CSV_FILES = ['sources', 'facts', 'routes', 'chokepoints', 'pipelines', 'vessels'];

export function buildDataset(raw) {
  const issues = [];
  const issue = (where, msg) => issues.push(`${where} — ${msg}`);

  // --- Sources ----------------------------------------------------------------
  const SOURCES = parseCsv(raw.sources).map((s) => ({
    id: s.source_id,
    publisher: s.publisher,
    title: s.title,
    url: s.url,
    published: s.published,
    kind: s.kind,
  }));
  const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

  // --- Facts ------------------------------------------------------------------
  const FACTS = parseCsv(raw.facts).map((f) => {
    const source = SOURCE_BY_ID[f.source_id] ?? null;
    if (!source) issue(f.fact_id, `unknown source "${f.source_id}"`);
    return {
      id: f.fact_id,
      timeframe: f.timeframe === 'current' ? 'current' : 'baseline',
      rawTimeframe: f.timeframe,
      appliesTo: splitList(f.applies_to),
      scope: f.scope,
      statement: f.statement,
      value: f.value,
      unit: f.unit,
      period: f.period,
      sourceId: f.source_id,
      source,
      quote: f.quote,
      verification: f.verification || 'auto',
      checkedOn: f.checked_on,
      note: f.note,
    };
  });
  const FACT_BY_ID = Object.fromEntries(FACTS.map((f) => [f.id, f]));

  const factsFor = new Map();
  for (const f of FACTS) {
    for (const target of f.appliesTo) {
      if (!factsFor.has(target)) factsFor.set(target, []);
      factsFor.get(target).push(f);
    }
  }
  const fact = (id, where, key) => {
    if (!id) return null;
    if (!FACT_BY_ID[id]) issue(where, `${key} "${id}" does not exist in facts.csv`);
    return FACT_BY_ID[id] ?? null;
  };
  /** Facts attached to a target, with its lead and status facts first. */
  const collect = (id, lead, status) => {
    const list = [...(factsFor.get(id) ?? [])];
    for (const extra of [status, lead]) {
      if (!extra) continue;
      const at = list.indexOf(extra);
      if (at !== -1) list.splice(at, 1);
      list.unshift(extra);
    }
    return list;
  };
  const sourcesOf = (facts) => [...new Set(facts.map((f) => f.sourceId))];
  /** The reference facts and the situation facts, kept apart. */
  const split = (facts) => ({
    baselineFacts: facts.filter((f) => f.timeframe === 'baseline'),
    currentFacts: facts.filter((f) => f.timeframe === 'current'),
  });

  // --- Chokepoints --------------------------------------------------------------
  const CHOKEPOINTS = parseCsv(raw.chokepoints).map((c) => {
    const id = c.chokepoint_id;
    const leadFact = fact(c.lead_fact, id, 'lead_fact');
    const statusFact = fact(c.status_fact, id, 'status_fact');
    if (!CHOKEPOINT_POSITIONS[id]) issue(id, 'no position in waypoints.js');
    const facts = collect(id, leadFact, statusFact);
    return {
      id,
      name: c.name,
      c: CHOKEPOINT_POSITIONS[id] ?? [0, 0],
      status: c.status,
      statusFact,
      leadFact,
      analysis: c.analysis,
      situation: c.situation ?? '',
      facts,
      ...split(facts),
      sourceIds: sourcesOf(facts),
    };
  });
  const CHOKEPOINT_BY_ID = Object.fromEntries(CHOKEPOINTS.map((c) => [c.id, c]));

  // --- Pipelines ----------------------------------------------------------------
  const PIPELINES = parseCsv(raw.pipelines).map((p) => {
    const id = p.pipeline_id;
    const leadFact = fact(p.lead_fact, id, 'lead_fact');
    if (!PIPELINE_PATHS[id]) issue(id, 'no path in waypoints.js');
    const facts = collect(id, leadFact, null);
    return {
      id,
      name: p.name,
      country: p.country,
      path: PIPELINE_PATHS[id] ?? [],
      leadFact,
      analysis: p.analysis,
      situation: p.situation ?? '',
      facts,
      ...split(facts),
      sourceIds: sourcesOf(facts),
    };
  });

  // --- Vessel classes ---------------------------------------------------------------
  const VESSELS = parseCsv(raw.vessels ?? '').map((v) => ({
    id: v.vessel_class,
    label: v.label || v.vessel_class,
    segment: v.segment,
    speedKn: Number(v.speed_kn),
    speedFact: fact(v.speed_fact, v.vessel_class, 'speed_fact'),
  }));
  const VESSEL_BY_ID = Object.fromEntries(VESSELS.map((v) => [v.id, v]));

  /**
   * Sailing time at sea: published port-to-port distance (or, failing that, the
   * drawn path) divided by the segment's sourced fleet-average speed. Excludes
   * port time, canal waiting and ballast legs — the UI says so.
   */
  const sailingFor = (r, id, path) => {
    const vessel = r.vessel_class ? VESSEL_BY_ID[r.vessel_class] : null;
    if (r.vessel_class && !vessel) issue(id, `unknown vessel_class "${r.vessel_class}"`);
    const published = Number(r.distance_nm) > 0 ? Number(r.distance_nm) : null;
    const distanceNm = published ?? (path.length ? Math.round(pathLengthNm(path)) : null);
    const days =
      vessel && vessel.speedKn > 0 && distanceNm ? distanceNm / (vessel.speedKn * 24) : null;
    return {
      vessel,
      distanceNm,
      distanceSource: published ? 'published' : 'drawn',
      distanceFact: fact(r.distance_fact, id, 'distance_fact'),
      transitFact: fact(r.transit_fact, id, 'transit_fact'),
      days: days == null ? null : Math.max(1, Math.round(days)),
    };
  };

  // --- Routes -------------------------------------------------------------------
  const ROUTES = parseCsv(raw.routes).map((r) => {
    const id = r.route_id;
    const from = PORTS[r.from_port];
    const to = PORTS[r.to_port];
    if (!from) issue(id, `unknown from_port "${r.from_port}"`);
    if (!to) issue(id, `unknown to_port "${r.to_port}"`);
    if (!ROUTE_PATHS[id]) issue(id, 'no path in geometry.js');
    const leadFact = fact(r.lead_fact, id, 'lead_fact');
    const statusFact = fact(r.status_fact, id, 'status_fact');
    const facts = collect(id, leadFact, statusFact);
    return {
      id,
      commodity: r.commodity,
      sub: r.sub || null,
      name: r.name,
      fromPort: r.from_port,
      toPort: r.to_port,
      from: from?.name ?? r.from_port,
      to: to?.name ?? r.to_port,
      // Country is looked up on the port rather than parsed from its label:
      // "Jask (Iran, Gulf of Oman)" names a sea in the same parentheses.
      fromCountry: from?.country ?? null,
      toCountry: to?.country ?? null,
      chokepoints: splitList(r.chokepoints),
      status: r.status,
      statusFact,
      weight: Number(r.weight),
      leadFact,
      // Trading context, country level: who sells, who buys, why the route matters.
      trading: {
        sellers: r.sellers ?? '',
        buyers: r.buyers ?? '',
        whyItMatters: r.why_it_matters ?? '',
        facts: splitList(r.context_facts).map((fid) => fact(fid, id, 'context_facts')).filter(Boolean),
      },
      situation: r.situation ?? '',
      facts,
      ...split(facts),
      sourceIds: sourcesOf(facts),
      path: ROUTE_PATHS[id] ?? [],
      sailing: sailingFor(r, id, ROUTE_PATHS[id] ?? []),
    };
  });
  const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

  return {
    SOURCES,
    SOURCE_BY_ID,
    FACTS,
    FACT_BY_ID,
    ROUTES,
    ROUTE_BY_ID,
    CHOKEPOINTS,
    CHOKEPOINT_BY_ID,
    PIPELINES,
    VESSELS,
    VESSEL_BY_ID,
    issues,
  };
}
