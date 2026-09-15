#!/usr/bin/env node
/**
 * Offline check of the AI news brief.
 *
 *   npm run check:news
 *
 * 1. data/live/news_sources.csv is well formed: unique ids, known kinds and
 *    topics, an https feed URL (rss) or a query (google_news), a positive quota.
 * 2. The categories the model may use (scripts/news/build_news.py) match the
 *    labels the page knows (src/data/news.js).
 * 3. The builder's own tests pass on saved feeds and a saved model answer
 *    (`python3 scripts/news/build_news.py --self-test`) — no network, no API key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseCsv } from '../src/data/csv.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = ['rss', 'google_news'];
const TOPICS = ['shipping', 'energy', 'metals', 'agri', 'geopolitics'];
const problems = [];

const rows = parseCsv(fs.readFileSync(path.join(ROOT, 'data/live/news_sources.csv'), 'utf8'));
const ids = new Set();
for (const r of rows) {
  const id = r.source_id;
  if (!/^[a-z0-9-]+$/.test(id)) problems.push(`${id}: id must be lowercase letters, digits and dashes`);
  if (ids.has(id)) problems.push(`${id}: duplicate id`);
  ids.add(id);
  if (!r.name) problems.push(`${id}: name is required`);
  if (!KINDS.includes(r.kind)) problems.push(`${id}: kind must be ${KINDS.join(' or ')}`);
  if (!TOPICS.includes(r.topic)) problems.push(`${id}: topic must be one of ${TOPICS.join(', ')}`);
  if (r.kind === 'rss' && !/^https:\/\//.test(r.url_or_query)) problems.push(`${id}: rss feeds need an https URL`);
  if (r.kind === 'google_news' && (!r.url_or_query || /^https?:/.test(r.url_or_query)))
    problems.push(`${id}: google_news sources take a search query, not a URL`);
  if (!(Number(r.max_items) > 0)) problems.push(`${id}: max_items must be a positive number`);
}

const py = fs.readFileSync(path.join(ROOT, 'scripts/news/build_news.py'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'src/data/news.js'), 'utf8');
const pyCategories = [...(py.match(/^CATEGORIES = \[(.*)\]$/m)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const jsBlock = js.match(/NEWS_CATEGORIES = \{([\s\S]*?)\};/)?.[1] ?? '';
const jsCategories = [...jsBlock.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map((m) => m[1]);
if (!pyCategories.length || pyCategories.join() !== jsCategories.join()) {
  problems.push(`categories differ: build_news.py [${pyCategories}] vs news.js [${jsCategories}]`);
}

console.log(`\nNews brief check — ${rows.length} sources, ${pyCategories.length} categories`);

const run = spawnSync('python3', ['scripts/news/build_news.py', '--self-test'], { cwd: ROOT, encoding: 'utf8' });
if (run.error) {
  console.log('  ⚠  python3 not found — builder self-test skipped (it runs in GitHub Actions)');
} else if (run.status !== 0) {
  problems.push(`builder self-test failed:\n${run.stdout}${run.stderr}`);
} else {
  console.log('  builder self-test passed');
}

if (problems.length) {
  console.log(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`   · ${p}`);
  process.exit(1);
}
console.log('✅ News brief configuration is consistent.\n');
