# The dataset

Everything the map says — route names, ports, statuses, figures, analysis, sources —
lives in the five CSV files in this folder. Edit them in any spreadsheet (LibreOffice,
Excel, Google Sheets) or a text editor, save as **CSV, UTF-8, comma-separated**, then run:

```bash
npm run check:data
```

The app rebuilds from these files: `npm run dev` picks up a change on reload, and
`npm run build` / `npm run build:standalone` bake it in.

## Two periods: the 2025 reference and the current situation

Every fact is filed in one of two periods, and the map never mixes them:

- **`baseline` — 2025 reference.** The figures that size a corridor, measured before
  the Strait of Hormuz closed on **28 February 2026** (mostly 2025; some 2024 or
  January–February 2026 data where 2025 is not available).
- **`current` — since the war.** What has changed since the closure: halted traffic,
  blockades, reroutings, new flows.

On a route card the *Reference figures — 2025* block shows the lead fact, the
`analysis` and the other baseline facts; the *Current situation* block shows the
status, the `situation` text, the `status_fact` and every current fact. The date of
that block is `SITUATION_AS_OF` in `src/data/timeframes.js` — change it whenever you
review the current facts.

## How the files fit together

```
sources.csv ──< facts.csv >── routes.csv / chokepoints.csv / pipelines.csv
```

A **source** is a web page or report. A **fact** is one figure or claim taken from a
source, with the exact sentence it comes from. **Routes**, **chokepoints** and
**pipelines** point to facts; they never hold a figure themselves.

## `facts.csv` — one row per sourced figure

| column | meaning |
|---|---|
| `fact_id` | unique id, lowercase with dashes (`hormuz-oil-1h25`) |
| `timeframe` | `baseline` (2025 reference, before 28 February 2026) or `current` (since then) |
| `applies_to` | ids of the routes, chokepoints, pipelines or commodity families the fact is shown on, separated by `\|` |
| `scope` | how far the figure reaches — see below |
| `statement` | the sentence shown on the map, written in English |
| `value` | the key number of the statement, as written there (`20.9`, `74%`) — optional |
| `unit`, `period` | unit and period of that number (`Mb/d`, `H1 2025`) |
| `source_id` | id from `sources.csv` |
| `quote` | the sentence copied **verbatim** from the source |
| `verification` | `auto` (the quote can be found in the page text) or `manual` (page rendered by JavaScript, checked by hand) |
| `checked_on` | date the quote was last checked, `YYYY-MM-DD` |
| `note` | caveats: table columns, decimal commas, definitions |

**Scopes** — the badge that tells a reader whether a figure is about this very flow:

- `corridor` — this origin → destination flow (e.g. China’s imports *from Angola*)
- `exporter` / `importer` — the exporting or importing country as a whole
- `chokepoint` — a strait or canal on the route
- `market` — the global market
- `status` — evidence for an operational status
- `policy` — quota, ban, export control
- `infrastructure` — port, terminal, pipeline, capacity

**Rules enforced by `check:data`:**

- every number in `statement` must also appear in `quote` (years, `Q1`/`H1` and
  `2025/26` season suffixes excepted — they go in `period`); `1,111`, `1 111` and
  `108,2` / `108.2` count as the same number;
- `value`, when filled, must appear in both `statement` and `quote`;
- `quote` must not be empty and `source_id` must exist;
- a `current` fact needs a 2026 `period`; a `baseline` fact cannot have a period after
  February 2026 (`2026-06`, `H1 2026`, `Q2 2026`…).

## `routes.csv`

| column | meaning |
|---|---|
| `route_id` | unique id; must match a path in `src/data/geometry.js` |
| `commodity` | `crude`, `products`, `lng`, `coal`, `fertilizer`, `grain`, `metals`, `iron` |
| `sub` | metals only: `copper`, `aluminium`, `nickel`, `zinc`, `tin`, `lithium`, `cobalt`, `rareEarths`, `ferroalloys` |
| `name` | label shown in the list |
| `from_port`, `to_port` | port keys from `PORTS` in `src/data/waypoints.js` (they set the countries used by the country filter) |
| `chokepoints` | chokepoint ids crossed, separated by `\|` — must match the drawn path |
| `status` | `normal`, `reduced`, `rerouted`, `disrupted` or `new` |
| `status_fact` | fact proving the status — **required** for anything other than `normal` |
| `weight` | 1 to 5: line thickness, an editorial rank, not a measurement |
| `lead_fact` | the 2025 reference figure shown in the list and tooltip — must be a `baseline` fact listing this route in `applies_to` |
| `analysis` | the route in the reference period, short English text — **no figures** (years allowed) |
| `situation` | what the war has changed, short English text — no figures; leave empty if nothing is documented (it then needs no current fact) |

`chokepoints.csv` and `pipelines.csv` follow the same pattern (`lead_fact`,
`status_fact`, `analysis`, `situation`); their map positions and paths are in
`src/data/waypoints.js`.

## `sources.csv`

`source_id`, `publisher`, `title`, `url`, `published` (as stated on the page:
`2026`, `2026-03` or `2026-03-03`; leave empty if the page gives no clear date) and
`kind`: `official` (government or intergovernmental agency), `industry` (trade-data
firm, price agency, industry body), `news` (press reporting someone else’s data),
`reference` (encyclopedia, wiki, aggregator). Every source must be cited by at least
one fact.

## Common edits

**Update a figure.** Find the fact in `facts.csv` (the id is shown under each fact on
the map and in *Data & sources*), replace `statement`, `value`, `period` and `quote`
with the new source sentence, update `source_id` if the source changed and set
`checked_on` to today.

**Add a figure to a route.** Add a row to `facts.csv` with the route id in
`applies_to`. To make it the headline figure, put its `fact_id` in the route’s
`lead_fact`.

**Change a status.** Set `status` in `routes.csv`, point `status_fact` to a fact
(scope `status`, timeframe `current`) quoting the evidence, update `situation`, and
update `SITUATION_AS_OF` in `src/data/timeframes.js`.

**Add a source.** Add a row to `sources.csv`, then cite it from a fact.

**Add a route.** Add a row to `routes.csv`, at least one fact, and a path under the
same id in `src/data/geometry.js`; then run `npm run check:data` and
`npm run check:land`.

## Re-checking the quotes online

```bash
npm run check:sources
```

Downloads every source page and looks for each quote. It reports quotes that are no
longer on their page (fix those), pages that block automated requests (open them by
hand), and PDFs (search the PDF for the quote). Limit it to some sources with
`npm run check:sources -- eiaChokepoints ieaHormuz`.

## `live/instruments.csv` — market prices (automated)

Not part of the verified dataset: these series are fetched automatically (see the
main README, *Live market prices*).

| column | meaning |
|---|---|
| `instrument_id` | unique id, lowercase with dashes |
| `commodity` | commodity family the price is shown with (`crude`, `lng`, `metals`…) |
| `name`, `unit`, `note` | labels shown on the page |
| `source` | `yahoo` (futures, delayed) or `fred` (IMF monthly series) |
| `symbol` | Yahoo ticker (`BZ=F`) or FRED series id (`PIORECRUSDM`) |
| `exchange` | exchange or publisher, for reference |
| `cadence` | `intraday` or `monthly` |
| `max_age_days` | a value older than this is rejected as stale — check a new ticker still trades before adding it |

The first instrument of each family is the one shown when all families are selected.
Run `npm run check:live`, then `npm run prices` to try a change locally.
