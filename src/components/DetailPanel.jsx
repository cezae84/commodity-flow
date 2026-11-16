import {
  COMMODITY_BY_ID,
  STATUS,
  SUBFILTER_BY_ID,
} from '../data/commodities.js';
import { CHOKEPOINT_BY_ID, ROUTES } from '../data/index.js';
import { alternativesFor, chokepointExposure } from '../data/insights.js';
import { pathLengthNm } from '../lib/geo.js';
import { TIMEFRAMES, WAR_START } from '../data/timeframes.js';
import { FactCard, FactList } from './Facts.jsx';
import { PriceRow } from './MarketsPanel.jsx';
import Star from './Star.jsx';
import StatusTag from './StatusTag.jsx';
import { instrumentsFor } from '../data/live.js';

/**
 * The two periods, never mixed: what sized the corridor in 2025, then what the
 * war has changed. A status fact dated before the war still appears under
 * "current situation" — it is the latest evidence — but its own badge says so.
 */
function ReferencePeriod({ item }) {
  const rest = item.baselineFacts.filter((f) => f !== item.leadFact && f !== item.statusFact);
  return (
    <section className="period period--baseline">
      <h3 className="period__title">{TIMEFRAMES.baseline.heading}</h3>
      <ul className="facts">
        <FactCard fact={item.leadFact} emphasis />
      </ul>
      {item.trading ? (
        <dl className="trading">
          <div>
            <dt>Sellers</dt>
            <dd>{item.trading.sellers}</dd>
          </div>
          <div>
            <dt>Buyers</dt>
            <dd>{item.trading.buyers}</dd>
          </div>
          <div>
            <dt>Why it matters</dt>
            <dd>{item.trading.whyItMatters}</dd>
          </div>
        </dl>
      ) : (
        <p className="period__text">{item.analysis}</p>
      )}
      {rest.length > 0 && (
        <details className="period__more">
          <summary>More 2025 reference facts ({rest.length})</summary>
          <FactList facts={rest} />
        </details>
      )}
    </section>
  );
}

function CurrentPeriod({ item }) {
  const status = item.status ? STATUS[item.status] : null;
  const more = item.currentFacts.filter((f) => f !== item.statusFact);
  const staleStatus = item.statusFact && item.statusFact.timeframe === 'baseline';
  return (
    <section
      className={`period period--current${item.status ? ` period--${item.status}` : ''}`}
      style={status ? { '--status-color': status.color } : undefined}
    >
      <div className="period__headrow">
        <h3 className="period__title">{TIMEFRAMES.current.heading}</h3>
        {status && <StatusTag status={item.status} long />}
      </div>
      <p className="period__text">
        {item.situation ||
          `No change since ${WAR_START} is documented in this dataset for this ${
            item.status ? 'corridor' : 'pipeline'
          }.`}
      </p>
      {staleStatus && (
        <p className="period__caveat">
          The latest evidence for this status predates the war.
        </p>
      )}
      {item.statusFact && (
        <ul className="facts">
          <FactCard fact={item.statusFact} showTimeframe={staleStatus} />
        </ul>
      )}
      {more.length > 0 && (
        <details className="period__more" open={!item.statusFact && more.length <= 2}>
          <summary>
            {item.statusFact ? 'More facts since the war' : 'Facts since the war'} ({more.length})
          </summary>
          <FactList facts={more} />
        </details>
      )}
    </section>
  );
}

/** Live prices for the route's commodity: an automated layer, labelled as such. */
function Prices({ prices, watchlist }) {
  if (!prices.length) return null;
  return (
    <section className="period period--prices">
      <h3 className="period__title">Market prices now</h3>
      <ul className="prices">
        {prices.map((inst) => (
          <PriceRow
            key={inst.instrument_id}
            inst={inst}
            showReference
            starred={watchlist?.isPrice(inst.instrument_id)}
            onToggleStar={watchlist?.togglePrice}
          />
        ))}
      </ul>
      <p className="markets__note">
        Automated feed, not part of the verified dataset: futures from Yahoo Finance
        (delayed, indicative), monthly averages from the IMF via FRED.
      </p>
    </section>
  );
}

/**
 * How long the voyage takes, and on what basis: a computed sailing time from
 * the published distance and the segment's sourced average speed, next to any
 * published transit time for the route. Both are shown with their sources.
 */
function Freight({ sailing }) {
  const { vessel, distanceFact, transitFact, days } = sailing;
  if (!vessel && !distanceFact && !transitFact) return null;
  return (
    <section className="period period--freight">
      <h3 className="period__title">Freight — sailing time</h3>
      {days != null && (
        <p className="period__text freight__calc">
          <strong>≈ {days} days at sea</strong>: {sailing.distanceNm.toLocaleString('en-GB')} nm
          {sailing.distanceSource === 'drawn' ? ' (drawn path)' : ''} at {vessel.speedKn} knots, the
          average sailing speed of {vessel.segment}
          {vessel.speedFact?.period ? ` (${vessel.speedFact.period})` : ''}. Excludes loading,
          discharge, canal waiting and the ballast leg.
        </p>
      )}
      <ul className="facts">
        {[transitFact, distanceFact, vessel?.speedFact].filter(Boolean).map((f) => (
          <FactCard key={f.id} fact={f} />
        ))}
      </ul>
    </section>
  );
}

/** One alternative corridor: who it is, how it stands now, how long it sails. */
function AltRow({ route, label, onSelect }) {
  const c = COMMODITY_BY_ID[route.commodity];
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(route.id)}
        style={{ '--route-color': c.color, '--row-color': c.color }}
        title={route.name}
      >
        <span className="cp-routes__dot" aria-hidden="true" />
        <span className="cp-routes__name">{label}</span>
        {route.status !== 'normal' && <StatusTag status={route.status} />}
        <span className="cp-routes__commodity">
          {route.sailing.days != null ? `≈ ${route.sailing.days} d` : '—'}
        </span>
      </button>
    </li>
  );
}

/**
 * What the two ends of the corridor can turn to: other origins drawn into the
 * same destination country, other destinations drawn out of the same origin.
 * A reading of the map, not a list of every supplier — the note says so.
 */
function Alternatives({ route, onSelectRoute }) {
  const { suppliers, outlets } = alternativesFor(route, ROUTES);
  if (!suppliers.length && !outlets.length) return null;
  const good =
    (route.sub ? SUBFILTER_BY_ID[route.sub]?.label : null) ??
    COMMODITY_BY_ID[route.commodity].label;
  return (
    <div className="detail__block alternatives">
      <h3>Alternatives on this map</h3>
      {suppliers.length > 0 && (
        <>
          <p className="alternatives__lead">
            Other origins of {good.toLowerCase()} into {route.toCountry}
          </p>
          <ul className="cp-routes">
            {suppliers.map((r) => (
              <AltRow
                key={r.id}
                route={r}
                label={r.name}
                onSelect={onSelectRoute}
              />
            ))}
          </ul>
        </>
      )}
      {outlets.length > 0 && (
        <>
          <p className="alternatives__lead">
            Other destinations of {good.toLowerCase()} out of {route.fromCountry}
          </p>
          <ul className="cp-routes">
            {outlets.map((r) => (
              <AltRow
                key={r.id}
                route={r}
                label={r.name}
                onSelect={onSelectRoute}
              />
            ))}
          </ul>
        </>
      )}
      <p className="alternatives__note">
        Days are the computed time at sea of each corridor (
        {route.sailing.days != null ? `≈ ${route.sailing.days} d` : 'not sourced'} for
        this one). Only corridors drawn on this map are listed — it is not a full list of
        suppliers or buyers.
      </p>
    </div>
  );
}

/** What depends on the strait, counted on the corridors drawn through it. */
function Exposure({ routes }) {
  if (!routes.length) return null;
  const e = chokepointExposure(routes);
  const names = (list) => list.map(({ id, count }) => `${id} (${count})`).join(', ');
  return (
    <div className="detail__block exposure">
      <h3>What crosses it on this map</h3>
      <ul className="exposure__families">
        {e.families.map(({ id, count }) => {
          const c = COMMODITY_BY_ID[id];
          return (
            <li key={id}>
              <span
                className="profile__swatch"
                style={{ background: c.color }}
                aria-hidden="true"
              />
              {c.label} <span className="profile__n">{count}</span>
            </li>
          );
        })}
      </ul>
      <dl className="exposure__ends">
        <div>
          <dt>Loading in</dt>
          <dd>{names(e.loading)}</dd>
        </div>
        <div>
          <dt>Discharging in</dt>
          <dd>{names(e.discharging)}</dd>
        </div>
      </dl>
      <p className="alternatives__note">
        {e.affected} of {routes.length} corridors through it are not running normally.
        Counts of drawn corridors, not volumes.
      </p>
    </div>
  );
}

export function RouteDetail({
  route,
  market,
  watchlist,
  onClose,
  onSelectChokepoint,
  onSelectRoute,
}) {
  const commodity = COMMODITY_BY_ID[route.commodity];
  const sub = route.sub ? SUBFILTER_BY_ID[route.sub] : null;
  const distance = Math.round(pathLengthNm(route.path));
  const crossed = route.chokepoints.map((id) => CHOKEPOINT_BY_ID[id]).filter(Boolean);
  const prices = market?.status === 'ok' ? instrumentsFor(market.data, route.commodity) : [];

  return (
    <div className="detail" style={{ '--route-color': commodity.color }}>
      <button type="button" className="detail__close" onClick={onClose}>
        ← Back to the list
      </button>

      <span className="detail__kicker">
        <span
          className="detail__swatch"
          style={{ background: commodity.color }}
          aria-hidden="true"
        />
        {commodity.label}
        {sub && <span className="detail__sub"> · {sub.label}</span>}
      </span>
      <div className="detail__titlerow">
        <h2 className="detail__title">{route.name}</h2>
        {watchlist && (
          <Star
            active={watchlist.isRoute(route.id)}
            onToggle={() => watchlist.toggleRoute(route.id)}
            label={route.name}
            className="detail__star"
          />
        )}
      </div>

      <div className="detail__od">
        <div>
          <span className="detail__odlabel">From</span>
          <span className="detail__odvalue">{route.from}</span>
        </div>
        <span className="detail__arrow" aria-hidden="true">
          →
        </span>
        <div>
          <span className="detail__odlabel">To</span>
          <span className="detail__odvalue">{route.to}</span>
        </div>
      </div>

      <div className="detail__stats detail__stats--three">
        <div className="stat">
          <span className="stat__value">
            {route.sailing.days != null ? `≈ ${route.sailing.days} d` : '—'}
          </span>
          <span className="stat__label">
            {route.sailing.days != null
              ? `at sea · ${route.sailing.vessel.label} at ${route.sailing.vessel.speedKn} kn`
              : 'sailing time not sourced yet'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__value">
            {(route.sailing.distanceNm ?? distance).toLocaleString('en-GB')}
          </span>
          <span className="stat__label">
            nautical miles ({route.sailing.distanceSource === 'published' ? 'published' : 'drawn path'})
          </span>
        </div>
        <div className="stat">
          <span className="stat__value">{crossed.length}</span>
          <span className="stat__label">
            {crossed.length === 0
              ? 'chokepoints — open-sea route'
              : `chokepoint${crossed.length === 1 ? '' : 's'} crossed`}
          </span>
        </div>
      </div>

      <CurrentPeriod item={route} />
      <ReferencePeriod item={route} />
      <Freight sailing={route.sailing} />
      <Prices prices={prices} watchlist={watchlist} />

      {crossed.length > 0 && (
        <div className="detail__block">
          <h3>Chokepoints crossed</h3>
          <ul className="cp-list">
            {crossed.map((cp) => (
              <li key={cp.id}>
                <button
                  type="button"
                  className="cp-row"
                  onClick={() => onSelectChokepoint(cp.id)}
                >
                  <span className="cp-row__name">{cp.name}</span>
                  <StatusTag status={cp.status} />
                  <span className="cp-row__go" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Alternatives route={route} onSelectRoute={onSelectRoute} />

      <p className="detail__footnote">
        Ports mark where a flow typically loads and discharges; when a source reports a
        country-level figure, the port is representative. Line thickness is an editorial
        rank (1–5), not a measurement.
      </p>
    </div>
  );
}

export function ChokepointDetail({ chokepoint, routes, onClose, onSelectRoute }) {
  const status = STATUS[chokepoint.status];

  return (
    <div className="detail" style={{ '--route-color': status.color }}>
      <button type="button" className="detail__close" onClick={onClose}>
        ← Back to the list
      </button>

      <span className="detail__kicker">Chokepoint</span>
      <h2 className="detail__title">{chokepoint.name}</h2>

      <CurrentPeriod item={chokepoint} />
      <ReferencePeriod item={chokepoint} />
      <Exposure routes={routes} />

      <div className="detail__block">
        <h3>Routes using it ({routes.length})</h3>
        <ul className="cp-routes">
          {routes.map((r) => {
            const c = COMMODITY_BY_ID[r.commodity];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelectRoute(r.id)}
                  style={{ '--route-color': c.color }}
                >
                  <span className="cp-routes__dot" aria-hidden="true" />
                  <span className="cp-routes__name">{r.name}</span>
                  {r.status !== 'normal' && <StatusTag status={r.status} />}
                  <span className="cp-routes__commodity">{c.short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
