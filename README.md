# CommodityMap

An interactive, terminal-style map of the world's major seaborne commodity corridors
and markets. **83 routes**, **10 chokepoints** and **3 bypass pipelines**, backed by
**263 sourced facts** from **115 sources** — every figure carries a link and the
verbatim sentence it was taken from — plus **18 market prices** refreshed
automatically.

The sidebar has one menu with four entries:

- **Routes** — filters (commodity, sub-family, country, search) and the route list.
- **Markets** — every price, grouped by commodity family, with its daily or monthly
  change and a 30-point sparkline.
- **★ Watchlist** — the routes and prices you starred (☆ on any route card, route
  detail or price). Saved in your browser only (localStorage, no account). One click
  shows only the watchlist routes on the map.
- **Data** — the *Data & sources* tables.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

The app is served at http://localhost:5173. A server is required: the code ships
as ES modules, which browsers refuse to load over `file://`. For a version you
can open by double-clicking, see [Standalone file](#standalone-file-no-server).

## What the map does

- **Filter by commodity** — 8 families: crude oil, refined products, LNG, coal,
  iron ore, grain & oilseeds, metals & ores, fertilizers. Selecting one leaves
  only its corridors on screen.
- **Metals sub-filters** — 26 corridors across nine sub-families, grouped into
  *base metals* (copper, aluminium & bauxite, nickel, zinc, tin) and
  *critical minerals* (lithium, cobalt, rare earths, manganese & chrome). A
  sub-filter **narrows** what is shown without ever repainting the lines: colour
  stays with the family, and the metal is named by the chip and the detail card.
- **Filter by country, with direction** — one row with two selects: *Departing*,
  *Arriving* or *Either way*, then the country. The country list is counted against
  the routes currently in play, so a country with nothing left to show under the
  active commodity filter is simply not offered.
- **Free-text search** across route names, ports and fact statements, accent-insensitive.
  The map shows exactly what the panel lists.
- **Filters compose** — commodity, sub-family, country and search stack, and a
  *Clear filters* link resets them in one click.
- **Hover the list** — pointing at a row thickens its line on the map.
- **Route detail** — origin, destination, drawn distance, the key figure, the
  evidence for the status, a short analysis, every other sourced fact and the
  chokepoints crossed. Each fact shows a scope badge (*this corridor*, *exporter*,
  *importer*, *chokepoint*…), its period, a link to the source and, on demand, the
  verbatim quote.
- **Data & sources** — a full-screen table of every fact (searchable, filterable by
  scope and by source), every source with its citation count, and every route with
  its key figure. The five CSV files can be downloaded from there.
- **Chokepoints** — Hormuz, Malacca, Suez, Bab el-Mandeb, Cape of Good Hope,
  Panama, the Turkish Straits, the Danish Straits, Lombok, Sunda. Click one for
  its sourced volumes and the list of routes using it.
- **Operational status (August 2026)** — normal, reduced, rerouted, halted, or
  recently opened; every status other than normal cites its evidence. Line style
  (solid / dashed) and an icon carry the information: never colour alone.
- **Generalisation when zoomed out** — past 20 visible corridors the lightest are
  hidden until you zoom out of world scale. A printed atlas does the same. The panel counter reports how many are
  hidden, and a checkbox disables the behaviour.
- **Hormuz bypass pipelines** — Petroline, ADCOP, Goreh-Jask, dashed in grey,
  with their capacities.

## Data

**Everything editorial lives in `data/*.csv`** — see [`data/README.md`](data/README.md)
for the columns and the editing rules.

| file | rows | content |
|---|---|---|
| `data/sources.csv` | 114 | publisher, title, URL, publication date, type of source |
| `data/facts.csv` | 258 | statement, value, unit, period, scope, source, **verbatim quote**, check date |
| `data/routes.csv` | 83 | commodity, ports, chokepoints, status + evidence, rank, lead fact, analysis |
| `data/chokepoints.csv` | 10 | status + evidence, lead fact, analysis |
| `data/pipelines.csv` | 3 | lead fact, analysis |

Geometry stays in code: ports and chokepoint positions in `src/data/waypoints.js`,
route paths in `src/data/geometry.js`.

**How the figures were verified.** Each source page was downloaded and every quote
matched against its text; the same check can be re-run at any time with
`npm run check:sources`. Numbers in a statement must appear in its quote
(`npm run check:data` enforces it), and analysis texts contain no figures of their own.

**Two periods, never mixed.** Every fact is filed either as a **2025 reference**
figure (before the Strait of Hormuz closed on 28 February 2026; H1 2025 for EIA
chokepoint data) or as part of the **current situation** since the war. Route and
chokepoint cards show them in two separate blocks; the list and tooltips label the
figure *2025* and the status *Now*. The situation date lives in
`src/data/timeframes.js`, and `npm run check:data` fails if a war-period fact is used
as a reference figure or filed as baseline.

**What a figure does and does not say.** A scope badge distinguishes figures about the
corridor itself from figures about its exporter, importer or chokepoint. When a source
only reports a country-level flow, the port drawn is representative, and the route
analysis says so. Line thickness is an ordinal rank from 1 to 5, not a measurement.

**Scope** — only flows carried in bulk by sea appear here.

## Live market prices

Alongside the verified dataset, the map shows **market prices refreshed automatically**:
a *Markets* panel under the commodity filter, *Market prices now* in each route's
current-situation block (with the gap to the 2025 average), and a *Market prices* tab in
*Data & sources*. These prices are an automated feed and never enter `data/facts.csv`.

| Series | Source | Frequency |
|---|---|---|
| Brent, WTI, ULSD, RBOB, Henry Hub, TTF, soybeans, corn, wheat, soybean meal, copper, aluminium — front-month futures | Yahoo Finance chart endpoint | intraday, delayed ~10–15 min |
| Japan LNG, nickel, zinc, tin, iron ore, Australian coal | IMF Primary Commodity Prices via FRED | monthly averages |

The list lives in `data/live/instruments.csv` (add a row to add an instrument).

**How it updates.** `.github/workflows/update-prices.yml` runs every 30 minutes on
weekdays (and on demand). It runs `scripts/live/fetch_prices.py` — standard-library Python,
no dependencies — and force-pushes the result as `prices.json` to the repository's
`live-data` branch. The page fetches that file from `raw.githubusercontent.com` on load
and every five minutes, so **prices change without redeploying the site**. On Netlify the
URL is derived from the linked repository; elsewhere set `VITE_LIVE_DATA_URL`.

**Safeguards.** A price is rejected when missing, not positive or older than
`max_age_days` — some Yahoo commodity tickers still answer but stopped trading years ago
(iron ore `TIO=F`: 2021, API2 coal `MTF=F`: February 2025), which is why those series come
from the IMF instead. A failed instrument keeps its last published value, shown as
*not refreshed* with the error. Without the feed (offline, standalone file) the panels
simply stay hidden.

**Limits, stated on the page.** Yahoo Finance is unofficial and delayed; continuous
front-month series jump when a contract rolls; futures are exchange benchmarks, not
physical delivered prices. `FRED_API_KEY` (free, https://fred.stlouisfed.org/docs/api/api_key.html)
is optional: set it as a repository secret to use FRED's official API instead of the CSV
download.

```bash
npm run prices
```

fetches the prices locally into `.live/prices.json`, which `npm run dev` serves.

## Checks

```bash
npm run check
```

Runs lint, the translation guard, the dataset audit, the live-feed check, the land/sea
check and the build, in that order. Each can also be run on its own.

### `npm run check:sources`

Not part of `npm run check` because it needs the network: downloads every source page
and looks for each quote verbatim. Quotes missing from a reachable page fail the
check; pages that block automated requests and PDFs are listed for a manual look.

### `npm run check:english`

Walks every user-facing string — route names, fact statements, analyses, ports,
chokepoints, pipelines, commodities, statuses and JSX literals — and fails if anything
still reads as French. Quotes are verbatim and are not checked.

### `npm run check:data`

- **References** — every id resolves: sources, facts, ports, chokepoints, pipelines,
  commodities, statuses, sub-families.
- **Evidence** — every route, chokepoint and pipeline has facts and a lead fact that
  applies to it; any status other than normal cites a fact; every fact has a quote;
  every number of a statement appears in its quote; analyses and commodity blurbs
  carry no figures; every source is cited.
- **Geography** — a route that declares a strait passes through it and a route that
  passes through one declares it (a route's own port never counts as a transit:
  Fujairah sits 1.4° from Hormuz precisely because it exists to avoid it); path
  endpoints sit on the named ports; voyage lengths are plausible.

### `npm run check:land`

Samples every **smoothed** path (the exact geometry that is drawn) at 0.15°
intervals and tests it against Natural Earth 50 m land polygons. It fails if a
route crosses a landmass.

Some genuinely navigable passages are finer than the dataset's resolution — the
Suez and Panama canals, the Dover Strait, the Danish Straits, the Singapore
Strait, the Dardanelles, the Paraná channel, the Torres Strait, the Sulu Sea
passages. They are declared explicitly in `ALLOWED` (`scripts/check-land.mjs`)
and counted separately.

The Natural Earth basemap is downloaded on first run into `scripts/.cache/`
(git-ignored).

## Structure

```
data/                  the dataset — sources, facts, routes, chokepoints, pipelines (CSV)
src/
  data/
    csv.js             CSV reader/writer
    dataset.js         builds routes/facts/sources objects from the CSV text
    index.js           the dataset as the app imports it (CSV inlined at build time)
    geometry.js        route paths, keyed by route id
    waypoints.js       ports (with country), chokepoint positions, pipeline paths, segments
    commodities.js     8 families, validated palette, sub-filters, statuses
    filters.js         country filter helpers
    scopes.js          fact scope labels
  lib/geo.js           Chaikin smoothing, antimeridian handling, distances
  components/
    MapView.jsx        Leaflet rendering (casings, lines, markers, tooltips)
    DetailPanel.jsx    route and chokepoint cards   Facts.jsx  fact cards
    DataView.jsx       Data & sources tables
    CommodityFilter.jsx  CountryFilter.jsx  RouteList.jsx  MapPanel.jsx
  App.jsx              application state and layout
scripts/
  lib/dataset.mjs      loads data/*.csv for the scripts
  audit-routes.mjs     dataset integrity, evidence rules, geographic consistency
  check-sources.mjs    online re-verification of every quote
  check-english.mjs    translation guard
  check-land.mjs       land/sea check
  bundle-standalone.mjs  single-file HTML build
```

### Design notes

- **Chaikin smoothing** rather than a Catmull-Rom spline: corner cutting never
  leaves the convex hull of the original path, so a smoothed curve cannot wander
  onto land inside a narrow strait.
- **Antimeridian** — trans-Pacific routes are stored with continuous longitudes
  beyond ±180° (e.g. `-220` = 140°E); `pathVariants()` draws a ∓360° copy so they
  stay visible from any pan position.
- **Theme** — dark market-terminal style: black panels, amber monospace labels,
  CARTO *Dark Matter* basemap. Tokens are at the top of `src/index.css`.
- **Palette** — stepped for the dark basemap and **validated**, not eyeballed, with
  the dataviz palette validator (dark mode, water `#262626`): every hue inside the
  OKLCH lightness band, colour-vision separation ΔE 11.5 on the worst adjacent pair,
  normal-vision floor ΔE 17.4, contrast ≥ 3:1 against water. The hue order *is* the
  safety mechanism: do not reorder it, do not add a 9th hue.
- **Dark casing** under every path, drawn in three passes (all casings, then all
  lines, then the endpoints) — otherwise one route's casing would paint over its
  neighbour's line.
- **Tooltips** — Leaflet's stylesheet loads after this project's, so at equal
  specificity its `white-space: nowrap` wins and text overflows the bubble. The
  rule is therefore written as `.leaflet-tooltip.wm-tooltip`, and `width:
  max-content` with a cap gives a bubble that fits its text.
- **Country resolution** — every port carries an explicit `country` field rather
  than having it parsed out of its label: "Jask (Iran, Gulf of Oman)" names a sea
  in the same parentheses, which a naive extractor would read as a country.
- **Basemap** — CARTO *Dark Matter* tiles. OpenStreetMap / CARTO attribution is
  shown on the map.

## Standalone file (no server)

```bash
npm run build:standalone
```

Produces `commoditymap.html` at the repository root: **a single file
of roughly 550 kB**, openable by double-click, easy to archive or email. JS, CSS
and the favicon are inlined; the images in Leaflet's stylesheet become `data:`
URIs.

Two things to know:

- The bundle is compiled as an **IIFE**, not an ES module. Browsers refuse
  `<script type="module">` over `file://` (origin policy), so a classic script is
  the only way to open the page without a server.
- An **internet connection is still required** for the basemap, which loads from
  CARTO tiles. The routes, facts and sources live in the file and work offline.

`scripts/bundle-standalone.mjs` fails if any reference to a local file remains in
the markup or the CSS, or if the script ends up declared `type="module"`.

## Publishing online

### 1. Get a basemap key first

Without it CARTO stamps a repeated **"API key required" watermark** across every
tile. The map still works — it is a notice, not an outage — but it is not
something to publish.

The key is free, takes a minute and needs no CARTO account:
<https://carto.com/basemaps/apikey>. It covers 5 million tile requests a calendar
month under fair use. Two conditions: the CARTO and OpenStreetMap attribution
must stay visible (it is, bottom right of the map), and a key must not be shared
across unrelated projects. Commercial use needs a commercial key.

```bash
cp .env.example .env
```

Paste the key into `.env`, then build. `npm run build` prints a warning if the
key is missing, so a keyless build cannot ship unnoticed.

Publishing the key in the bundle is expected: basemap keys are public by design
and are restricted by domain on CARTO's side, not by secrecy.

### 2. Build

```bash
npm run build
```

The output lands in `dist/` — about 560 kB in total.

### 3. Deploy

`dist/` is a plain static folder with no server-side logic and no client-side
routing, so it deploys anywhere.

- **Cloudflare Pages or Netlify** — drag the `dist/` folder onto the dashboard.
  Free, automatic HTTPS, custom domain available, no git repository required.
  `public/_headers` is picked up by both and sets sensible cache lifetimes.
- **GitHub Pages** — also free, but a project site is served from
  `/repository-name/`, so you must set `base: '/repository-name/'` in
  `vite.config.js` first. Skipping that step is the classic cause of a blank page.
- **The standalone file** — `npm run build:standalone` needs no host at all.

Whatever the host, remember to rebuild after changing the key: `VITE_CARTO_KEY`
is inlined at build time, not read at runtime.
