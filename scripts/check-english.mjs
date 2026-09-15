#!/usr/bin/env node
/**
 * Guard against untranslated strings.
 *
 *   npm run check:english
 *
 * Walks every user-facing string — routes, facts, ports, chokepoints, pipelines,
 * commodities, statuses, sources and JSX literals — and flags anything that
 * still reads as French. Accented proper nouns (São Miguel, Paranaguá,
 * Bolívar, Réunion) are legitimate and are not matched.
 *
 * Exits 1 if anything is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { dataset } from './lib/dataset.mjs';
import { PORTS } from '../src/data/waypoints.js';
import { COMMODITIES, SUBFILTERS, SUBFILTER_GROUPS, STATUS } from '../src/data/commodities.js';

const { ROUTES, CHOKEPOINTS, PIPELINES, FACTS, SOURCES, VESSELS } = dataset;

// Common French words, on word boundaries. Accented proper nouns
// (São Miguel, Paranaguá, Bolívar, Réunion) are legitimate and are not listed.
const FR = /\b(les|des|du|une|dans|pour|avec|vers|sont|moins|entre|depuis|selon|chaque|toutes|leur|leurs|cette|qui|dont|ainsi|alors|encore|aussi|mais|donc|aux|elle|nous|ses|première|deuxième|mondial|mondiale|pays|voie|mer|golfe|détroit|oléoduc|charbon|cuivre|minerai|navire|exportées|importées|environ|jusqu|contre|sans|plus grand|premier|principaux|dernier)\b/i;

const hits = [];
const check = (where, value) => {
  if (typeof value !== 'string' || !value) return;
  if (FR.test(value)) hits.push(`${where}: ${value.slice(0, 90)}`);
};

for (const r of ROUTES) {
  check(`route ${r.id}.name`, r.name);
  check(`route ${r.id}.sellers`, r.trading.sellers);
  check(`route ${r.id}.buyers`, r.trading.buyers);
  check(`route ${r.id}.why_it_matters`, r.trading.whyItMatters);
  check(`route ${r.id}.situation`, r.situation);
}
for (const [k, p] of Object.entries(PORTS)) check(`port ${k}`, p.name);
for (const v of VESSELS) check(`vessel ${v.id}`, `${v.label} ${v.segment}`);
for (const c of CHOKEPOINTS) {
  check(`chokepoint ${c.id}.name`, c.name);
  check(`chokepoint ${c.id}.analysis`, c.analysis);
}
for (const b of PIPELINES) {
  check(`pipeline ${b.id}.name`, b.name);
  check(`pipeline ${b.id}.country`, b.country);
  check(`pipeline ${b.id}.analysis`, b.analysis);
}
// Quotes are verbatim and may legitimately be in another language; only the
// statements and notes written for this site are checked.
for (const f of FACTS) {
  check(`fact ${f.id}.statement`, f.statement);
  check(`fact ${f.id}.note`, f.note);
}
for (const c of COMMODITIES) { check(`commodity ${c.id}.label`, c.label); check(`commodity ${c.id}.blurb`, c.blurb); }
for (const s of SUBFILTERS.metals) check(`subfilter ${s.id}`, s.label);
for (const [k, v] of Object.entries(SUBFILTER_GROUPS)) check(`group ${k}`, v);
for (const [k, v] of Object.entries(STATUS)) check(`status ${k}`, v.label);
for (const v of SOURCES) check(`source ${v.id}.publisher`, v.publisher);

// String literals inside the JSX components
for (const f of ['src/App.jsx', ...fs.readdirSync(path.join(ROOT, 'src/components')).map(x => 'src/components/' + x)]) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of stripped.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}]{6,})\s*</g)) check(`${f} (text)`, m[1].trim());
  for (const m of stripped.matchAll(/(?:placeholder|aria-label|title)="([^"]+)"/g)) check(`${f} (attribute)`, m[1]);
}

console.log(`\nUser-facing string scan — ${hits.length} French leftover(s)`);
for (const h of hits) console.log('  · ' + h);
if (!hits.length) console.log('  ✅ everything reads as English\n');

if (hits.length) process.exit(1);
