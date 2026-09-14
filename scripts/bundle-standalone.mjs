#!/usr/bin/env node
/**
 * Assembles a single self-contained HTML file, openable by double-click.
 *
 *   npm run build:standalone
 *
 * Takes the output of `vite build --mode standalone` (IIFE bundle, images already
 * data: URIs) and inlines the JS, the CSS and the favicon into the HTML. The
 * result has no local dependency left: only the basemap tiles are still fetched
 * over the network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'dist-standalone');
const OUT = path.join(ROOT, 'commoditymap.html');

const read = (p) => fs.readFileSync(p, 'utf8');

const js = read(path.join(BUILD, 'app.js'));
const css = read(path.join(BUILD, 'app.css'));
const favicon = fs.readFileSync(path.join(ROOT, 'public', 'favicon.svg'));

// A </script> inside a JS string would close the tag too early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const title = 'CommodityMap';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link
      rel="icon"
      type="image/svg+xml"
      href="data:image/svg+xml;base64,${favicon.toString('base64')}"
    />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
${safeJs}
    </script>
  </body>
</html>
`;

fs.writeFileSync(OUT, html);

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
console.log(`\n✅ ${path.relative(ROOT, OUT)} — ${kb(Buffer.byteLength(html))}`);
console.log(`   JS ${kb(js.length)} · CSS ${kb(css.length)}`);
console.log('   Self-contained: open by double-click, no server needed.');
console.log('   An internet connection is still required for the basemap.\n');

// --- Guards: nothing may depend on a local file -------------------

const problems = [];

// 1. The markup (outside <script> and <style> contents) may only reference
//    data: URIs or absolute URLs.
const markup = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
for (const m of markup.matchAll(/(?:src|href)="(?!data:|https:|#)([^"]*)"/g)) {
  problems.push(`markup: ${m[1]}`);
}

// 2. The CSS must no longer point at separately emitted images.
// `url(#…)` is a fragment reference (a legacy IE rule in Leaflet), not a file:
// it does not compromise the document's self-containment.
for (const m of css.matchAll(/url\(\s*['"]?(?!data:|https:|#)([^'")]+)/g)) {
  problems.push(`css: url(${m[1]})`);
}

// 3. A `type="module"` would block loading over file://.
if (/<script[^>]*type=["']module["']/i.test(markup)) {
  problems.push('the script is declared type="module": blocked over file://');
}

if (problems.length) {
  console.error('⚠️  The file is not self-contained:');
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
