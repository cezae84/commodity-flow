#!/usr/bin/env node
/**
 * Re-verifies every quote against its live source page.
 *
 *   npm run check:sources            all facts
 *   npm run check:sources -- eiaLng  only the facts citing these source ids
 *
 * Downloads each source URL once, strips the markup and looks for each quote
 * verbatim (whitespace, curly quotes and dashes normalised). Results:
 *   ✓ found      the quote is on the page
 *   ✗ missing    the page loaded but the quote is not on it — the source changed
 *                or the quote is wrong: fix facts.csv
 *   ? unreachable  blocked (403), offline, or timed out — check by hand
 *   – skipped    PDF, or a fact marked verification=manual (JavaScript-rendered page)
 *
 * Needs a network connection, so it is not part of `npm run check`.
 * Exits 1 only when a reachable page is missing a quote.
 */
import { dataset } from './lib/dataset.mjs';

const only = new Set(process.argv.slice(2));
const facts = dataset.FACTS.filter((f) => !only.size || only.has(f.sourceId));

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

const norm = (t) =>
  t
    .replace(/[   ]/g, ' ')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const toText = (html) =>
  norm(
    decode(
      html
        .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );

async function load(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      redirect: 'follow',
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) return { status: 'unreachable', detail: `HTTP ${res.status}` };
    const type = res.headers.get('content-type') ?? '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (type.includes('pdf') || buf.subarray(0, 4).toString() === '%PDF') {
      return { status: 'skipped', detail: 'PDF — open it and search for the quote' };
    }
    return { status: 'ok', text: toText(buf.toString('utf8')) };
  } catch (err) {
    return { status: 'unreachable', detail: err.name === 'TimeoutError' ? 'timeout' : err.message };
  }
}

const pages = new Map();
const bySource = Map.groupBy(facts, (f) => f.sourceId);
const counts = { found: 0, missing: 0, unreachable: 0, skipped: 0 };

console.log(`\nSource check — ${facts.length} facts, ${bySource.size} pages\n`);

for (const [sourceId, group] of bySource) {
  const source = dataset.SOURCE_BY_ID[sourceId];
  if (!source) continue;
  const needsPage = group.some((f) => f.verification !== 'manual');
  if (needsPage && !pages.has(source.url)) pages.set(source.url, await load(source.url));
  const page = pages.get(source.url);

  console.log(`${source.publisher} — ${source.title}\n  ${source.url}`);
  for (const f of group) {
    let status;
    let detail = '';
    if (f.verification === 'manual') {
      status = 'skipped';
      detail = 'manual verification';
    } else if (page.status !== 'ok') {
      status = page.status;
      detail = page.detail;
    } else {
      status = page.text.includes(norm(f.quote)) ? 'found' : 'missing';
    }
    counts[status] += 1;
    const icon = { found: '✓', missing: '✗', unreachable: '?', skipped: '–' }[status];
    console.log(`  ${icon} ${f.id}${detail ? ` (${detail})` : ''}`);
  }
  console.log('');
}

console.log(
  `found ${counts.found} · missing ${counts.missing} · unreachable ${counts.unreachable} · skipped ${counts.skipped}\n`
);
process.exit(counts.missing ? 1 : 0);
