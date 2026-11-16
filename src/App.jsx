import { useCallback, useEffect, useMemo, useState } from 'react';

import MapView from './components/MapView.jsx';
import CommodityFilter from './components/CommodityFilter.jsx';
import RouteList from './components/RouteList.jsx';
import CountryFilter from './components/CountryFilter.jsx';
import MapPanel from './components/MapPanel.jsx';
import { RouteDetail, ChokepointDetail } from './components/DetailPanel.jsx';
import DataView from './components/DataView.jsx';
import MarketsPanel from './components/MarketsPanel.jsx';
import Watchlist from './components/Watchlist.jsx';
import NewsPanel, { NewsBrief } from './components/NewsPanel.jsx';
import ChokepointList from './components/ChokepointList.jsx';
import StatusFilter from './components/StatusFilter.jsx';
import Intro from './components/Intro.jsx';
import { useMarketPrices } from './data/live.js';
import { useWatchlist } from './data/favorites.js';
import { useNewsBrief } from './data/news.js';

import {
  ROUTES,
  ROUTE_BY_ID,
  CHOKEPOINTS,
  CHOKEPOINT_BY_ID,
  FACTS,
  SOURCES,
} from './data/index.js';
import { DIRECTIONS, matchesCountry, countriesFor } from './data/filters.js';
import { COMMODITY_BY_ID, STATUS, SUBFILTERS, SUBFILTER_BY_ID } from './data/commodities.js';
import { SITUATION_AS_OF } from './data/timeframes.js';

const LAYER_LABELS = {
  chokepoints: 'Chokepoints',
  bypass: 'Bypass pipelines',
  labels: 'Place names',
  declutter: 'Thin out when zoomed out',
};

/** Folds a string for accent- and case-insensitive search. */
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const VIEWS = ['routes', 'chokepoints', 'markets', 'watchlist', 'news'];

/**
 * What the address bar remembers, so a view can be bookmarked or shared:
 * `#route=crude-gulf-china`, `#chokepoint=hormuz`, `#commodity=lng&status=disrupted`.
 * Unknown ids are dropped rather than trusted.
 */
function readHash() {
  let p;
  try {
    p = new URLSearchParams(window.location.hash.slice(1));
  } catch {
    p = new URLSearchParams();
  }
  const route = p.get('route');
  const chokepoint = p.get('chokepoint');
  const commodity = p.get('commodity');
  const status = p.get('status');
  const view = p.get('view');
  return {
    route: route && ROUTE_BY_ID[route] ? route : null,
    chokepoint: chokepoint && CHOKEPOINT_BY_ID[chokepoint] ? chokepoint : null,
    commodity: commodity && COMMODITY_BY_ID[commodity] ? commodity : 'all',
    status: status && STATUS[status] ? status : null,
    view: VIEWS.includes(view) ? view : 'routes',
  };
}

export default function App() {
  const [initial] = useState(readHash);
  const [activeCommodity, setActiveCommodity] = useState(initial.commodity);
  const [activeSub, setActiveSub] = useState(null);
  // Restricts the list (and so the map) to one current status: halted, reduced…
  const [statusFilter, setStatusFilter] = useState(initial.status);
  const [direction, setDirection] = useState('from');
  const [country, setCountry] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(initial.route);
  const [selectedChokepointId, setSelectedChokepointId] = useState(
    initial.route ? null : initial.chokepoint
  );
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [layers, setLayers] = useState({
    chokepoints: true,
    bypass: false,
    labels: false,
    declutter: true,
  });
  const [dataOpen, setDataOpen] = useState(false);
  const market = useMarketPrices();
  const watchlist = useWatchlist();
  const news = useNewsBrief();
  // Sidebar menu: route selection, market prices, the user's watchlist, or (small
  // screens only, where the floating news panel is hidden) the market brief.
  const [view, setView] = useState(initial.view);
  // Restricts the map (and the route list) to the starred routes.
  const [watchOnly, setWatchOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shownOnMap, setShownOnMap] = useState(0);
  const [eligibleOnMap, setEligibleOnMap] = useState(0);

  const counts = useMemo(() => {
    const acc = {};
    for (const r of ROUTES) acc[r.commodity] = (acc[r.commodity] ?? 0) + 1;
    return acc;
  }, []);

  const subCounts = useMemo(() => {
    if (!SUBFILTERS[activeCommodity]) return {};
    const acc = {};
    for (const r of ROUTES) {
      if (r.commodity === activeCommodity && r.sub) {
        acc[r.sub] = (acc[r.sub] ?? 0) + 1;
      }
    }
    return acc;
  }, [activeCommodity]);

  // Routes surviving the commodity filter alone. The country list is counted
  // against these, so a country with nothing left to show is simply not offered.
  const commodityFiltered = useMemo(() => {
    let list =
      activeCommodity === 'all'
        ? ROUTES
        : ROUTES.filter((r) => r.commodity === activeCommodity);
    if (activeSub) list = list.filter((r) => r.sub === activeSub);
    return list;
  }, [activeCommodity, activeSub]);

  const countryOptions = useMemo(() => {
    const opts = countriesFor(commodityFiltered, direction);
    // Keep the current selection listed even at zero, so the select never
    // silently loses its value when the commodity filter narrows.
    if (country && !opts.some((o) => o.country === country)) {
      opts.push({ country, count: 0 });
      opts.sort((a, b) => a.country.localeCompare(b.country, 'en'));
    }
    return opts;
  }, [commodityFiltered, direction, country]);

  // Everything but the status filter: the status chips count against this list,
  // so each chip says how many routes it would leave.
  const beforeStatus = useMemo(() => {
    if (watchOnly) {
      return watchlist.routes.map((id) => ROUTE_BY_ID[id]).filter(Boolean);
    }
    const q = fold(query.trim());
    let list = commodityFiltered.filter((r) =>
      matchesCountry(r, country, direction)
    );
    if (q) {
      list = list.filter((r) =>
        fold(
          `${r.name} ${r.from} ${r.to} ${r.situation} ${r.facts.map((f) => f.statement).join(' ')}`
        ).includes(q)
      );
    }
    return [...list].sort(
      (a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'en')
    );
  }, [commodityFiltered, country, direction, query, watchOnly, watchlist.routes]);

  const statusCounts = useMemo(() => {
    const acc = {};
    for (const r of beforeStatus) acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, [beforeStatus]);

  const visibleRoutes = useMemo(
    () =>
      statusFilter && !watchOnly
        ? beforeStatus.filter((r) => r.status === statusFilter)
        : beforeStatus,
    [beforeStatus, statusFilter, watchOnly]
  );

  // Single source of truth: the map shows exactly what the panel lists, with no
  // duplicated filtering logic.
  const visibleIds = useMemo(
    () => new Set(visibleRoutes.map((r) => r.id)),
    [visibleRoutes]
  );

  const selectedRoute = selectedRouteId ? ROUTE_BY_ID[selectedRouteId] : null;
  const selectedChokepoint = selectedChokepointId
    ? CHOKEPOINT_BY_ID[selectedChokepointId]
    : null;

  const chokepointRoutes = useMemo(() => {
    if (!selectedChokepointId) return [];
    return ROUTES.filter((r) => r.chokepoints.includes(selectedChokepointId));
  }, [selectedChokepointId]);

  // Stable identities: MapView rebuilds its layers whenever these functions
  // change, and redrawing 84 routes is expensive.
  const selectRoute = useCallback((id) => {
    setSelectedRouteId(id);
    setSelectedChokepointId(null);
    setDrawerOpen(true);
  }, []);

  const selectChokepoint = useCallback((id) => {
    setSelectedChokepointId(id);
    setSelectedRouteId(null);
    setDrawerOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  const selectCommodity = useCallback((id) => {
    setActiveCommodity(id);
    setActiveSub(null);
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  const changeSub = useCallback((id) => {
    setActiveSub(id);
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  const changeStatus = useCallback((id) => {
    setStatusFilter(id);
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCommodity('all');
    setActiveSub(null);
    setStatusFilter(null);
    setCountry(null);
    setDirection('from');
    setQuery('');
    setWatchOnly(false);
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  // From the data table: jump to a route or a chokepoint on the map.
  const selectTarget = useCallback(
    (id) => {
      if (ROUTE_BY_ID[id]) selectRoute(id);
      else if (CHOKEPOINT_BY_ID[id]) selectChokepoint(id);
      else return;
      setDataOpen(false);
    },
    [selectRoute, selectChokepoint]
  );

  const openView = useCallback((id) => {
    setView(id);
    setSelectedRouteId(null);
    setSelectedChokepointId(null);
  }, []);

  const toggleLayer = useCallback((id, value) => {
    setLayers((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Primitives rather than an object: React bails out when the value is
  // unchanged, which avoids a loop with the drawing effect.
  const handleRenderStats = useCallback((shown, eligible) => {
    setShownOnMap(shown);
    setEligibleOnMap(eligible);
  }, []);

  // Keep the address bar in step with what is on screen (see readHash).
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedRouteId) p.set('route', selectedRouteId);
    else if (selectedChokepointId) p.set('chokepoint', selectedChokepointId);
    if (view !== 'routes') p.set('view', view);
    if (activeCommodity !== 'all') p.set('commodity', activeCommodity);
    if (statusFilter) p.set('status', statusFilter);
    const hash = p.toString();
    try {
      window.history.replaceState(
        null,
        '',
        hash ? `#${hash}` : window.location.pathname + window.location.search
      );
    } catch {
      // Some embedded or file:// contexts refuse history changes: nothing to keep in step.
    }
  }, [selectedRouteId, selectedChokepointId, view, activeCommodity, statusFilter]);

  // A pasted or edited link while the page is open.
  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setActiveCommodity(h.commodity);
      setStatusFilter(h.status);
      setView(h.view);
      setSelectedRouteId(h.route);
      setSelectedChokepointId(h.route ? null : h.chokepoint);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDataOpen(false);
        clearSelection();
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  const layerList = useMemo(
    () =>
      Object.entries(LAYER_LABELS).map(([id, label]) => ({
        id,
        label,
        value: layers[id],
      })),
    [layers]
  );

  const hiddenOnMap = Math.max(0, eligibleOnMap - shownOnMap);
  const hasFilters =
    activeCommodity !== 'all' ||
    Boolean(activeSub) ||
    Boolean(statusFilter) ||
    Boolean(country) ||
    Boolean(query) ||
    watchOnly;

  return (
    <div className="app">
      <aside className={`sidebar${drawerOpen ? ' is-open' : ''}`}>
        <header className="brand">
          <div className="brand__row">
            <h1 className="brand__title">CommodityFlow</h1>
            <button
              type="button"
              className="brand__close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <p className="brand__tag">
            Seaborne commodity corridors, sourced fact by fact
          </p>
          <dl className="brand__periods">
            <div>
              <dt>Figures</dt>
              <dd>2025 reference</dd>
            </div>
            <div>
              <dt>Situation as of</dt>
              <dd>{SITUATION_AS_OF}</dd>
            </div>
          </dl>
        </header>

        <nav className="menu" aria-label="Sidebar menu">
          {[
            { id: 'routes', label: 'Routes', count: ROUTES.length },
            { id: 'chokepoints', label: 'Chokepoints', count: CHOKEPOINTS.length },
            { id: 'markets', label: 'Markets', count: market.status === 'ok' ? Object.keys(market.data.instruments).length : null },
            { id: 'watchlist', label: '★', title: 'Watchlist', count: watchlist.routes.length + watchlist.prices.length },
            ...(news.status === 'ok' ? [{ id: 'news', label: 'News', count: null, className: ' menu__tab--news' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`menu__tab${tab.className ?? ''}${view === tab.id ? ' is-active' : ''}`}
              onClick={() => openView(tab.id)}
              aria-pressed={view === tab.id}
              aria-label={tab.title}
              title={tab.title}
            >
              {tab.label}
              {tab.count != null && <span className="menu__count">{tab.count}</span>}
            </button>
          ))}
          <button type="button" className="menu__tab menu__tab--data" onClick={() => setDataOpen(true)}>
            Data
          </button>
        </nav>

        <div className="sidebar__scroll">
          {selectedRoute ? (
            <RouteDetail
              route={selectedRoute}
              market={market}
              watchlist={watchlist}
              onClose={clearSelection}
              onSelectChokepoint={selectChokepoint}
            />
          ) : selectedChokepoint ? (
            <ChokepointDetail
              chokepoint={selectedChokepoint}
              routes={chokepointRoutes}
              onClose={clearSelection}
              onSelectRoute={selectRoute}
            />
          ) : view === 'chokepoints' ? (
            <ChokepointList onSelect={selectChokepoint} />
          ) : view === 'markets' ? (
            <MarketsPanel market={market} watchlist={watchlist} />
          ) : view === 'news' ? (
            <section className="panel">
              <h2 className="eyebrow">Market brief · last 24 hours</h2>
              <NewsBrief news={news} />
            </section>
          ) : view === 'watchlist' ? (
            <Watchlist
              watchlist={watchlist}
              market={market}
              onSelectRoute={selectRoute}
              onHoverRoute={setHoveredRouteId}
              selectedRouteId={selectedRouteId}
              watchOnly={watchOnly}
              onWatchOnlyChange={setWatchOnly}
            />
          ) : (
            <>
              {watchOnly && (
                <p className="watchonly">
                  The map shows your watchlist only.{' '}
                  <button type="button" onClick={() => setWatchOnly(false)}>
                    Show all routes
                  </button>
                </p>
              )}
              <Intro />
              <section className="filters">
                <h2 className="eyebrow">Filters</h2>

                <div className="search">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a port, a route, a figure…"
                    aria-label="Search the routes"
                  />
                  {query && (
                    <button
                      type="button"
                      className="search__clear"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <CountryFilter
                  direction={direction}
                  onDirectionChange={setDirection}
                  country={country}
                  onCountryChange={setCountry}
                  options={countryOptions}
                />

                {!watchOnly && (
                  <StatusFilter
                    active={statusFilter}
                    onChange={changeStatus}
                    counts={statusCounts}
                    total={beforeStatus.length}
                  />
                )}
              </section>

              <CommodityFilter
                active={activeCommodity}
                onChange={selectCommodity}
                counts={counts}
                total={ROUTES.length}
                activeSub={activeSub}
                onChangeSub={changeSub}
                subCounts={subCounts}
              />

              <section className="results">
                <div className="results__head">
                  <h2 className="eyebrow">
                    {visibleRoutes.length} route
                    {visibleRoutes.length === 1 ? '' : 's'}
                  </h2>
                  {hasFilters ? (
                    <button
                      type="button"
                      className="results__clear"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <span className="results__hint">largest corridors first</span>
                  )}
                </div>

                {country && (
                  <p className="results__scope">
                    {DIRECTIONS.find((d) => d.id === direction)?.label}{' '}
                    <strong>{country}</strong>
                    {activeSub && ` · ${SUBFILTER_BY_ID[activeSub]?.label}`}
                  </p>
                )}
                {hiddenOnMap > 0 && (
                  <p className="results__zoom">
                    The map draws the {shownOnMap} largest of these at this zoom —
                    zoom in, or pick a route below, to see the others.
                  </p>
                )}

                <RouteList
                  routes={visibleRoutes}
                  selectedId={selectedRouteId}
                  onSelect={selectRoute}
                  onHover={setHoveredRouteId}
                  watchlist={watchlist}
                />
              </section>

              <footer className="method">
                <h3 className="eyebrow">Method</h3>
                <p>
                  Every figure is a <strong>fact</strong> with its period, a link to
                  its source and the verbatim quote it comes from; no value is
                  estimated or interpolated. A badge says whether a fact describes the
                  corridor itself or only its exporter, importer or chokepoint.
                </p>
                <p>
                  <strong>Two periods, kept apart</strong> — the figures that size each
                  corridor are a <em>2025 reference</em>, measured before the Strait of
                  Hormuz closed on 28 February 2026. What the war has changed since —
                  closures, blockades, reroutings — is shown separately as the{' '}
                  <em>current situation</em>, reviewed as of {SITUATION_AS_OF}, and
                  every status other than normal cites its evidence.
                </p>
                <p>
                  <strong>Scope</strong> — only flows carried in bulk by sea appear
                  here. Ports are representative when a source reports country-level
                  flows.
                </p>
                <button
                  type="button"
                  className="method__data"
                  onClick={() => setDataOpen(true)}
                >
                  Browse the {FACTS.length} facts and {SOURCES.length} sources →
                </button>
              </footer>
            </>
          )}
        </div>
      </aside>

      <main className="mapwrap">
        <MapView
          visibleIds={visibleIds}
          selectedRouteId={selectedRouteId}
          onSelectRoute={selectRoute}
          hoveredRouteId={hoveredRouteId}
          selectedChokepointId={selectedChokepointId}
          onSelectChokepoint={selectChokepoint}
          showChokepoints={layers.chokepoints}
          showBypass={layers.bypass}
          showLabels={layers.labels}
          declutter={layers.declutter}
          onRenderStats={handleRenderStats}
        />

        <button
          type="button"
          className="drawer-handle"
          onClick={() => setDrawerOpen(true)}
        >
          Menu
        </button>

        <NewsPanel news={news} />

        {dataOpen && (
          <DataView
            onClose={() => setDataOpen(false)}
            onSelectTarget={selectTarget}
            market={market}
          />
        )}

        <MapPanel
          activeCommodity={activeCommodity}
          layers={layerList}
          onToggleLayer={toggleLayer}
          shown={shownOnMap}
          hidden={hiddenOnMap}
        />
      </main>
    </div>
  );
}
