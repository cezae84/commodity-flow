# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CommodityFlow — a static React + Leaflet map of seaborne commodity corridors (83 routes, 8 commodity families, 10 chokepoints, 359 sourced facts, 169 sources). There is no backend and no test framework: the dataset *is* the product, and correctness is enforced by the check scripts below. All user-facing text is in English; the maintainer converses in French.

The repository is aimed at readers of the output (recruiters, traders): `README.md` explains why the map exists and what it shows; technical documentation lives in `docs/TECHNICAL.md`; `docs/screenshots/` holds the README images.

## Commands

Node comes from nvm and is not on the PATH of non-interactive shells — prefix commands with `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` if `node` is not found.

```bash
npm run dev               # http://localhost:5173
npm run check             # lint → check:english → check:data → check:land → build (run before declaring work done)
npm run check:data        # references, evidence rules (numbers vs quotes), chokepoint/geography consistency
npm run check:sources     # online: re-fetches every source page and looks for each quote (not in `check`)
npm run check:land        # every smoothed path tested against Natural Earth 50 m land
npm run check:english     # fails on any French left in user-facing strings
npm run check:live        # instruments.csv consistency + offline self-test of the Python price fetcher
npm run check:news        # news_sources.csv + category sync + offline self-test of the news brief builder
npm run prices            # fetch live prices into .live/prices.json (served by `npm run dev`)
npm run news              # build the AI news brief into .live/news.json (needs ANTHROPIC_API_KEY in .env); news:demo = offline sample
npm run build             # dist/ — the deployable static site
npm run build:standalone  # commodityflow.html, single file openable over file://
```

Each check script is standalone (`node scripts/<name>.mjs`); there is no per-test granularity. `check:land` downloads Natural Earth polygons into `scripts/.cache/` on first run.

`VITE_CARTO_KEY` (in `.env`, see `.env.example`) is inlined at build time — rebuild after changing it. The build prints a warning when it is missing.

## Architecture

**Data flows one way: `data/*.csv` → `src/data/dataset.js` → `App.jsx` (filter state) → `visibleIds` → `MapView` and `RouteList`.**

- `data/*.csv` — the editorial dataset, documented in `data/README.md`. `sources.csv` ← `facts.csv` (statement, value, period, scope, source, verbatim quote) ← `routes.csv` / `chokepoints.csv` / `pipelines.csv`, which reference facts via `lead_fact` / `status_fact`. Routes carry a figure-free, country-level trading context (`sellers`, `buyers`, `why_it_matters`) backed by `context_facts`; chokepoints and pipelines carry a figure-free `analysis`. Facts attach to targets through `applies_to` (route, chokepoint, pipeline or commodity ids, `|`-separated).
- `src/data/dataset.js` — pure `buildDataset(rawCsvText)`; never throws, collects broken references in `issues`. `src/data/index.js` feeds it via Vite `?raw` imports (so the standalone build inlines the data); `scripts/lib/dataset.mjs` feeds it from disk for the node scripts. Components import from `src/data/index.js`; scripts import `dataset` from `scripts/lib/dataset.mjs`.
- `src/data/geometry.js` — `ROUTE_PATHS[routeId]`, built with `p(port.c, SEGMENT, [[lat,lng],…], …)`.
- `src/data/waypoints.js` — `PORTS` (each with an explicit `country`; routes reference port keys), `CHOKEPOINT_POSITIONS`, `PIPELINE_PATHS`, and reusable corridor segments (`GULF_OUT`, `MALACCA`, `CAPE_TO_MALACCA`…). Editing a segment moves every route that uses it — re-run `check:land` afterwards.
- `src/data/commodities.js` — `COMMODITIES` (colours, figure-free blurbs), `SUBFILTERS` (metals sub-families, grouped base/critical), `STATUS`. `src/data/filters.js` — `DIRECTIONS`, `matchesCountry`, `countriesFor`.
- `App.jsx` owns all filter state and computes `visibleRoutes` once; `visibleIds` is the single source of truth — the map renders exactly what the list shows. Do not add filtering logic inside `MapView`.
- `MapView.jsx` drives Leaflet imperatively via refs. Callbacks passed to it are `useCallback`-stable because identity changes rebuild all layers. A `mapEpoch` counter re-runs layer effects after StrictMode's double mount. On top of `visibleIds` it applies zoom-based generalisation (hides low-`weight` routes when more than 20 are eligible) and reports shown/eligible counts back via `onRenderStats` as primitives (objects would loop).

## Data rules (enforced or easy to break)

- Never write a figure that is not in a quote. Every number in a fact `statement` must appear in its `quote` (years, Q1/H1 and `/26` season suffixes excepted); `value` must appear in both. `analysis` fields and commodity blurbs must contain no digits other than years. When adding a fact, fetch the page and copy the sentence verbatim; mark `verification=manual` only for JavaScript-rendered pages.
- Use the `scope` honestly: `corridor` only when the figure is for that origin→destination flow; otherwise `exporter`, `importer`, `chokepoint`, `market`, `status`, `policy`, `infrastructure`. Ports are representative when sources are country-level — say so in the analysis rather than inventing port-level claims.
- Any `status` other than `normal` needs a `status_fact`. `weight` (1–5) is an ordinal for line thickness, not a measurement.
- A route's `chokepoints` must match its geometry: `check:data` fails both when a declared strait is not traversed and when a traversed one is not declared. A route's own origin/destination port is excluded from detection (Fujairah sits 1.4° from Hormuz by design).
- Trans-Pacific paths use continuous longitudes past ±180° (`-220` = 140°E); `pathVariants()` in `src/lib/geo.js` draws the ±360° copy. Keep a path's longitudes continuous rather than wrapping them.
- Paths are smoothed with Chaikin (`smoothPath`) before drawing *and* before `check:land`, so a fix must clear land after smoothing. Genuinely navigable passages finer than 50 m resolution go in `ALLOWED` in `scripts/check-land.mjs`, not in the data.
- Metals routes require a `sub` matching `SUBFILTERS.metals`. A new route needs a `routes.csv` row, a fact, and a path under the same id in `geometry.js`.
- Two periods are never mixed. Facts carry `timeframe`: `baseline` (2025 reference, before the Hormuz closure on 28 Feb 2026) or `current` (since then). `lead_fact` must be baseline; the trading context / `analysis` describe the reference period, `situation` the war period; `status`/`status_fact` describe now. `SITUATION_AS_OF` in `src/data/timeframes.js` dates the current block — bump it when statuses are reviewed.

## Live market prices

- `scripts/live/fetch_prices.py` (stdlib only) → `prices.json`, published by `.github/workflows/update-prices.yml` every 30 min to the `live-data` branch; `src/data/live.js` (`useMarketPrices`) fetches it at runtime. `main` is never touched by the workflow, so there is no rebuild per update.
- Prices are a separate automated layer: never write them into `facts.csv`; always label source, delay ("Yahoo Finance, delayed, indicative"), time and cadence.
- Keep the freshness guard (`max_age_days`) and the keep-last-good behaviour; a new instrument needs a row in `data/live/instruments.csv` and a live check that its ticker still trades.
- User agents matter: Yahoo rejects non-browser agents, FRED's CDN stalls on browser agents.

## AI news brief

- `scripts/news/build_news.py` (stdlib only) collects the last 24 h of headlines from `data/live/news_sources.csv`, has Claude Haiku 4.5 summarise them via a forced tool call, and **validates** the answer: items citing unknown headline ids, with an unknown category, or with a number absent from their cited headlines are dropped. Published by `.github/workflows/update-news.yml` every 2 h to the `live-news` branch (separate from `live-data`: each workflow force-pushes its own branch); `src/data/news.js` (`useNewsBrief`, built on `useLiveJson` in `live.js`) fetches it; `NewsPanel.jsx` floats on the right of the map on desktop and becomes a sidebar tab under 900 px.
- The brief is a labelled AI layer, never written into `facts.csv`. Keep the validator, the keep-last-good/stale behaviour and the "AI-generated" note. Categories are defined twice (`CATEGORIES` in the Python, `NEWS_CATEGORIES` in `news.js`); `check:news` fails if they drift.
- `ANTHROPIC_API_KEY` is a GitHub secret; locally it is read from the gitignored `.env`. Never commit it.

## Freight data

- `data/vessels.csv` (vessel class → segment speed + `speed_fact`) and route columns `vessel_class`, `distance_nm`, `distance_fact`, `transit_fact`. `dataset.js` computes `route.sailing` (days = distance ÷ speed × 24, published distance or drawn path). Freight facts use scope `freight`.
- Research is done by the project subagent `.claude/agents/freight-analyst.md` (verbatim quotes from saved pages, "not found" over guesses); review its rows before writing CSVs. Do not use uncited aggregators (MarTool, Shipfinex…) for transit times.

## Sidebar and watchlist

- The sidebar menu (`view` state in `App.jsx`: routes · markets · watchlist, plus the Data overlay) switches panels; selecting a route or chokepoint shows its detail on top of the current view, and "back" returns to it.
- `src/data/favorites.js` (`useWatchlist`) stores starred route ids and instrument ids in localStorage (`commoditymap:watchlist:v1`), every access guarded. `watchOnly` in `App.jsx` restricts `visibleRoutes` (so the map too) to starred routes.

## Styling constraints

- Dark terminal theme (CARTO Dark Matter, water `#383838` after the tile-pane filter); CSS tokens at the top of `src/index.css` (`--paper` = panel surface, `--ink` = text, `--accent` amber). The 8 commodity colours are validated for colour-vision deficiency against that water colour with the dataviz validator in dark mode — re-run it if the basemap or a hue changes; the **order is the safety mechanism**. Do not reorder, recolour ad hoc, or add a 9th hue — new groupings go into sub-filters, which narrow the display without repainting.
- Status is never conveyed by colour alone (icon + label + dash pattern).
- Leaflet's CSS loads after `src/index.css`, so overrides of Leaflet classes need doubled specificity (e.g. `.leaflet-tooltip.wm-tooltip`).
- Strings inside single-quoted JS literals use the typographic apostrophe `’`, not `'`.

## Standalone build

`vite build --mode standalone` emits an IIFE (browsers block `type="module"` over `file://`) with assets inlined as data URIs; `scripts/bundle-standalone.mjs` inlines JS/CSS/favicon into one HTML file and fails if any local reference or `type="module"` survives.
