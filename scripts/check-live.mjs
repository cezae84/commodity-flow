#!/usr/bin/env node
/**
 * Offline check of the live market-price feed.
 *
 *   npm run check:live
 *
 * 1. data/live/instruments.csv is well formed: unique ids, known commodity
 *    families, known sources, a unit, a cadence and a numeric freshness limit.
 * 2. The fetcher's own tests pass on saved responses
 *    (`python3 scripts/live/fetch_prices.py --self-test`) — no network needed,
 *    so this never fails because Yahoo or FRED is down.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseCsv } from '../src/data/csv.js';
import { COMMODITY_BY_ID } from '../src/data/commodities.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = ['yahoo', 'fred'];
const CADENCES = ['intraday', 'monthly'];
const problems = [];

const rows = parseCsv(fs.readFileSync(path.join(ROOT, 'data/live/instruments.csv'), 'utf8'));
const ids = new Set();
for (const r of rows) {
  const id = r.instrument_id;
  if (!/^[a-z0-9-]+$/.test(id)) problems.push(`${id}: id must be lowercase letters, digits and dashes`);
  if (ids.has(id)) problems.push(`${id}: duplicate id`);
  ids.add(id);
  if (!COMMODITY_BY_ID[r.commodity]) problems.push(`${id}: unknown commodity "${r.commodity}"`);
  if (!SOURCES.includes(r.source)) problems.push(`${id}: source must be ${SOURCES.join(' or ')}`);
  if (!CADENCES.includes(r.cadence)) problems.push(`${id}: cadence must be ${CADENCES.join(' or ')}`);
  if (!r.symbol || !r.name || !r.unit) problems.push(`${id}: symbol, name and unit are required`);
  if (!(Number(r.max_age_days) > 0)) problems.push(`${id}: max_age_days must be a positive number`);
}

console.log(`\nLive feed check — ${rows.length} instruments`);

const py = spawnSync('python3', ['scripts/live/fetch_prices.py', '--self-test'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (py.error) {
  console.log('  ⚠  python3 not found — fetcher self-test skipped (it runs in GitHub Actions)');
} else if (py.status !== 0) {
  problems.push(`fetcher self-test failed:\n${py.stdout}${py.stderr}`);
} else {
  console.log('  fetcher self-test passed');
}

if (problems.length) {
  console.log(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`   · ${p}`);
  process.exit(1);
}
console.log('✅ Live feed configuration is consistent.\n');
