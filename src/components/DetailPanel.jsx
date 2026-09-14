import {
  COMMODITY_BY_ID,
  STATUS,
  SUBFILTER_BY_ID,
} from '../data/commodities.js';
import { CHOKEPOINT_BY_ID } from '../data/index.js';
import { pathLengthNm } from '../lib/geo.js';
import { TIMEFRAMES, WAR_START } from '../data/timeframes.js';
import { FactCard, FactList } from './Facts.jsx';
import { PriceRow } from './MarketsPanel.jsx';
import Star from './Star.jsx';
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
      <p className="period__text">{item.analysis}</p>
      {rest.length > 0 && (
        <details className="period__more">
          <summary>More 2025 reference facts ({rest.length})</summary>
          <FactList facts={rest} />
        </details>
      )}
    </section>
  );
}

function CurrentPeriod({ item, prices = [], watchlist }) {
  const status = item.status ? STATUS[item.status] : null;
  const evidence = [
    ...(item.statusFact ? [item.statusFact] : []),
    ...item.currentFacts.filter((f) => f !== item.statusFact),
  ];
  const staleStatus = item.statusFact && item.statusFact.timeframe === 'baseline';
  return (
    <section className="period period--current">
      <h3 className="period__title">{TIMEFRAMES.current.heading}</h3>
      {status && (
        <p className="period__status" style={{ color: status.color }}>
          {status.icon} {status.label}
        </p>
      )}
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
      {evidence.length > 0 && (
        <ul className="facts">
          {evidence.map((f) => (
            <FactCard key={f.id} fact={f} showTimeframe={f.timeframe === 'baseline'} />
          ))}
        </ul>
      )}
      {prices.length > 0 && (
        <div className="period__markets">
          <h4 className="period__subtitle">Market prices now</h4>
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
        </div>
      )}
    </section>
  );
}

export function RouteDetail({ route, market, watchlist, onClose, onSelectChokepoint }) {
  const commodity = COMMODITY_BY_ID[route.commodity];
  const status = STATUS[route.status];
  const sub = route.sub ? SUBFILTER_BY_ID[route.sub] : null;
  const distance = Math.round(pathLengthNm(route.path));

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

      <div className="detail__stats">
        <div className="stat">
          <span className="stat__value">
            {distance.toLocaleString('en-GB')}
          </span>
          <span className="stat__label">nautical miles (drawn path)</span>
        </div>
        <div className="stat">
          <span className="stat__value" style={{ color: status.color }}>
            {status.icon}
          </span>
          <span className="stat__label">Now: {status.label}</span>
        </div>
      </div>

      <ReferencePeriod item={route} />
      <CurrentPeriod
        item={route}
        watchlist={watchlist}
        prices={market?.status === 'ok' ? instrumentsFor(market.data, route.commodity) : []}
      />

      {route.chokepoints.length > 0 && (
        <div className="detail__block">
          <h3>Chokepoints crossed</h3>
          <div className="cp-tags">
            {route.chokepoints.map((id) => {
              const cp = CHOKEPOINT_BY_ID[id];
              if (!cp) return null;
              const cpStatus = STATUS[cp.status];
              return (
                <button
                  key={id}
                  type="button"
                  className="cp-tag"
                  onClick={() => onSelectChokepoint(id)}
                  style={{ '--cp-color': cpStatus.color }}
                >
                  <span className="cp-tag__dot" aria-hidden="true" />
                  {cp.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      <span className="detail__kicker" style={{ color: status.color }}>
        {status.icon} Chokepoint — now: {status.label}
      </span>
      <h2 className="detail__title">{chokepoint.name}</h2>

      <ReferencePeriod item={chokepoint} />
      <CurrentPeriod item={chokepoint} />

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
                  <span>{r.name}</span>
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
