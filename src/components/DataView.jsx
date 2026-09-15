import { useMemo, useState } from 'react';

import {
  FACTS,
  SOURCES,
  ROUTES,
  ROUTE_BY_ID,
  CHOKEPOINT_BY_ID,
  PIPELINES,
  RAW_CSV,
} from '../data/index.js';
import { COMMODITY_BY_ID, STATUS } from '../data/commodities.js';
import { SCOPES } from '../data/scopes.js';
import { TIMEFRAMES, SITUATION_AS_OF } from '../data/timeframes.js';
import { ScopeBadge, SourceLink, TimeframeBadge } from './Facts.jsx';
import { Change } from './MarketsPanel.jsx';
import { LIVE_DATA_URL, formatAsOf, formatPct, formatPrice, vsReference } from '../data/live.js';

const PIPELINE_BY_ID = Object.fromEntries(PIPELINES.map((p) => [p.id, p]));

const fold = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Human label for an `applies_to` id: a route, a chokepoint, a pipeline or a family. */
function targetLabel(id) {
  return (
    ROUTE_BY_ID[id]?.name ??
    CHOKEPOINT_BY_ID[id]?.name ??
    PIPELINE_BY_ID[id]?.name ??
    COMMODITY_BY_ID[id]?.label ??
    id
  );
}

const KIND_LABELS = {
  official: 'Official statistics / agency',
  industry: 'Industry data / price agency',
  news: 'Press (reporting third-party data)',
  reference: 'Reference / aggregator',
};

/** Hands the untouched CSV file to the browser, exactly as stored in data/. */
function download(name) {
  const blob = new Blob([RAW_CSV[name]], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function FactsTable({ onSelectTarget }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [timeframe, setTimeframe] = useState('');

  const citations = useMemo(() => {
    const acc = {};
    for (const f of FACTS) acc[f.sourceId] = (acc[f.sourceId] ?? 0) + 1;
    return acc;
  }, []);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return FACTS.filter(
      (f) =>
        (!timeframe || f.timeframe === timeframe) &&
        (!scope || f.scope === scope) &&
        (!sourceId || f.sourceId === sourceId) &&
        (!q ||
          fold(
            `${f.id} ${f.statement} ${f.quote} ${f.note} ${f.source?.publisher} ${f.appliesTo
              .map(targetLabel)
              .join(' ')}`
          ).includes(q))
    );
  }, [query, scope, sourceId, timeframe]);

  return (
    <>
      <div className="dataview__filters">
        <div className="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a figure, a quote, a route, a publisher…"
            aria-label="Search the facts"
          />
        </div>
        <label className="select">
          <span className="sr-only">Period</span>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="">All periods</option>
            {Object.entries(TIMEFRAMES).map(([id, t]) => (
              <option key={id} value={id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <span className="sr-only">Scope</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">All scopes</option>
            {Object.entries(SCOPES).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <span className="sr-only">Source</span>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">All sources</option>
            {[...SOURCES]
              .sort((a, b) => a.publisher.localeCompare(b.publisher, 'en'))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.publisher} — {s.title} ({citations[s.id] ?? 0})
                </option>
              ))}
          </select>
        </label>
        <span className="dataview__count">
          {rows.length} of {FACTS.length} facts
        </span>
      </div>

      <div className="dataview__tablewrap">
        <table className="datatable">
          <thead>
            <tr>
              <th>Fact</th>
              <th>Applies to</th>
              <th>Source &amp; verbatim quote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="datatable__fact">
                  <div className="fact__head">
                    <TimeframeBadge timeframe={f.timeframe} />
                    <ScopeBadge scope={f.scope} />
                    {f.period && <span className="fact__period">{f.period}</span>}
                  </div>
                  <p>{f.statement}</p>
                  {f.value && (
                    <p className="datatable__value">
                      Value checked: <strong>{f.value}</strong> {f.unit}
                    </p>
                  )}
                  <code className="datatable__id">{f.id}</code>
                </td>
                <td className="datatable__targets">
                  {f.appliesTo.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="datatable__target"
                      onClick={() => onSelectTarget(id)}
                      disabled={!ROUTE_BY_ID[id] && !CHOKEPOINT_BY_ID[id]}
                    >
                      {targetLabel(id)}
                    </button>
                  ))}
                </td>
                <td className="datatable__source">
                  <SourceLink source={f.source} />
                  <blockquote className="fact__quote">“{f.quote}”</blockquote>
                  {f.note && <p className="fact__note">{f.note}</p>}
                  <p className="fact__meta">
                    {f.verification === 'manual' ? 'Checked by hand' : 'Quote matched'} ·{' '}
                    {f.checkedOn}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SourcesTable() {
  const citations = useMemo(() => {
    const acc = {};
    for (const f of FACTS) acc[f.sourceId] = (acc[f.sourceId] ?? 0) + 1;
    return acc;
  }, []);
  const rows = [...SOURCES].sort((a, b) => a.publisher.localeCompare(b.publisher, 'en'));
  return (
    <div className="dataview__tablewrap">
      <table className="datatable">
        <thead>
          <tr>
            <th>Source</th>
            <th>Type</th>
            <th>Published</th>
            <th>Facts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.publisher} — {s.title}
                </a>
                <code className="datatable__id">{s.id}</code>
              </td>
              <td>{KIND_LABELS[s.kind] ?? s.kind}</td>
              <td>{s.published || '—'}</td>
              <td>{citations[s.id] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoutesTable({ onSelectTarget }) {
  const rows = [...ROUTES].sort(
    (a, b) => a.commodity.localeCompare(b.commodity) || a.name.localeCompare(b.name, 'en')
  );
  return (
    <div className="dataview__tablewrap">
      <table className="datatable">
        <thead>
          <tr>
            <th>Route</th>
            <th>Freight</th>
            <th>2025 reference figure</th>
            <th>Now ({SITUATION_AS_OF})</th>
            <th>Facts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = STATUS[r.status];
            return (
              <tr key={r.id}>
                <td>
                  <button
                    type="button"
                    className="datatable__target"
                    onClick={() => onSelectTarget(r.id)}
                  >
                    {r.name}
                  </button>
                  <span className="datatable__muted">
                    {COMMODITY_BY_ID[r.commodity]?.short} · {r.from} → {r.to}
                  </span>
                  <code className="datatable__id">{r.id}</code>
                </td>
                <td>
                  {r.sailing.days != null ? `≈ ${r.sailing.days} days` : '—'}
                  <span className="datatable__muted">
                    {r.sailing.vessel ? `${r.sailing.vessel.label} · ` : ''}
                    {r.sailing.distanceNm?.toLocaleString('en-GB')} nm ({r.sailing.distanceSource})
                  </span>
                </td>
                <td>{r.leadFact?.statement}</td>
                <td>
                  <span style={{ color: status?.color }}>
                    {status?.icon} {status?.label}
                  </span>
                  {r.situation && <span className="datatable__muted">{r.situation}</span>}
                </td>
                <td>{r.facts.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MarketsTable({ market }) {
  if (market.status !== 'ok') {
    return (
      <p className="dataview__empty">
        {market.status === 'loading'
          ? 'Loading market prices…'
          : 'Market prices are not available here (offline, or no live feed configured).'}
      </p>
    );
  }
  const rows = Object.values(market.data.instruments);
  return (
    <div className="dataview__tablewrap">
      <p className="dataview__intro">
        Automated feed, kept apart from the verified facts. Futures are front-month
        contracts from Yahoo Finance (unofficial, delayed, indicative; the series jumps when
        a contract rolls). Monthly series are IMF Primary Commodity Prices via FRED. File
        generated {market.data.generated_at} ·{' '}
        <a href={LIVE_DATA_URL} target="_blank" rel="noreferrer">
          prices.json
        </a>
      </p>
      <table className="datatable">
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Latest</th>
            <th>Change</th>
            <th>vs 2025 average</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const ref = vsReference(i);
            return (
              <tr key={i.instrument_id}>
                <td>
                  {i.name}
                  <span className="datatable__muted">
                    {COMMODITY_BY_ID[i.commodity]?.short} · {i.contract || i.note}
                  </span>
                  <code className="datatable__id">{i.symbol}</code>
                </td>
                <td>
                  {formatPrice(i.value)} {i.unit}
                  <span className="datatable__muted">
                    {i.cadence === 'monthly' ? `${formatAsOf(i)} average` : formatAsOf(i)}
                  </span>
                  {i.stale && (
                    <span className="price__stale" title={i.last_error}>
                      ⚠ not refreshed: {i.last_error}
                    </span>
                  )}
                </td>
                <td>
                  <Change inst={i} />
                  <span className="datatable__muted">vs {i.change_basis}</span>
                </td>
                <td>
                  {ref != null ? `${formatPct(ref)} (${formatPrice(i.avg_reference)})` : '—'}
                </td>
                <td>
                  <a href={i.quote_url} target="_blank" rel="noreferrer">
                    {i.source_label}
                  </a>
                  <span className="datatable__muted">{i.notice}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  { id: 'facts', label: `Facts (${FACTS.length})` },
  { id: 'sources', label: `Sources (${SOURCES.length})` },
  { id: 'routes', label: `Routes (${ROUTES.length})` },
  { id: 'markets', label: 'Market prices' },
];

/**
 * The whole dataset, inspectable in one place: every figure with its verbatim
 * quote and link, every source and how often it is cited, and the CSV files
 * themselves for anyone who wants to check or reuse them.
 */
export default function DataView({ onClose, onSelectTarget, market }) {
  const [tab, setTab] = useState('facts');

  return (
    <div className="dataview" role="dialog" aria-label="Data and sources">
      <header className="dataview__head">
        <div>
          <h2 className="dataview__title">Data &amp; sources</h2>
          <p className="dataview__sub">
            Every figure on the map is a fact with a verbatim quote from its source, filed
            either as a <strong>2025 reference</strong> figure (before the Strait of Hormuz
            closed on 28 February 2026) or as a fact about the situation <strong>since the
            war</strong>, reviewed as of {SITUATION_AS_OF}. The
            same tables are plain CSV files in the project’s <code>data/</code> folder —
            edit them there, then run <code>npm run check:data</code>.
          </p>
        </div>
        <button type="button" className="dataview__close" onClick={onClose}>
          Close ✕
        </button>
      </header>

      <nav className="dataview__tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dataview__tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
        <span className="dataview__downloads">
          Download:
          {Object.keys(RAW_CSV).map((name) => (
            <button key={name} type="button" onClick={() => download(name)}>
              {name}.csv
            </button>
          ))}
        </span>
      </nav>

      {tab === 'facts' && <FactsTable onSelectTarget={onSelectTarget} />}
      {tab === 'sources' && <SourcesTable />}
      {tab === 'routes' && <RoutesTable onSelectTarget={onSelectTarget} />}
      {tab === 'markets' && <MarketsTable market={market} />}
    </div>
  );
}
