import { COMMODITIES } from '../data/commodities.js';
import Star from './Star.jsx';
import {
  formatAsOf,
  formatPct,
  formatPrice,
  vsReference,
} from '../data/live.js';

/** A tiny line of the last closes — shape only, no axis, so no false precision. */
function Sparkline({ points }) {
  if (!points || points.length < 2) return null;
  const values = points.map((p) => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 64;
  const h = 18;
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Direction is carried by the arrow and the sign, never by colour alone. */
export function Change({ inst }) {
  if (inst.change_pct == null) return null;
  const dir = inst.change_pct > 0 ? 'up' : inst.change_pct < 0 ? 'down' : 'flat';
  const icon = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  return (
    <span className={`chg chg--${dir}`} title={`vs ${inst.change_basis} (${inst.previous_as_of})`}>
      {icon} {formatPct(inst.change_pct)}
    </span>
  );
}

export function PriceRow({ inst, showReference = false, starred, onToggleStar }) {
  const ref = vsReference(inst);
  return (
    <li className={`price${inst.stale ? ' price--stale' : ''}${onToggleStar ? ' price--starrable' : ''}`}>
      {onToggleStar && (
        <Star active={starred} onToggle={() => onToggleStar(inst.instrument_id)} label={inst.name} className="price__star" />
      )}
      <div className="price__main">
        <a className="price__name" href={inst.quote_url} target="_blank" rel="noreferrer">
          {inst.name}
        </a>
        <span className="price__value">
          {formatPrice(inst.value)} <span className="price__unit">{inst.unit}</span>
        </span>
      </div>
      <div className="price__meta">
        <Change inst={inst} />
        <span className="price__asof">
          {inst.cadence === 'monthly' ? `${formatAsOf(inst)} avg.` : formatAsOf(inst)}
        </span>
        {inst.stale && (
          <span className="price__stale" title={inst.last_error}>
            ⚠ not refreshed
          </span>
        )}
        {!showReference && <Sparkline points={inst.spark} />}
      </div>
      {showReference && ref != null && (
        <div className="price__ref">
          {formatPct(ref)} vs 2025 average ({formatPrice(inst.avg_reference)})
        </div>
      )}
    </li>
  );
}

/** Explains why there is nothing to show, instead of an empty panel. */
export function MarketUnavailable({ market }) {
  return (
    <p className="empty">
      {market.status === 'loading'
        ? 'Loading market prices…'
        : 'Market prices are unavailable here — offline, or no live feed configured for this build.'}
    </p>
  );
}

export function MarketNote({ data }) {
  const generated = new Date(data.generated_at);
  return (
    <p className="markets__note">
      Futures: Yahoo Finance, delayed and indicative. Monthly series: IMF via FRED. Feed
      refreshed{' '}
      {generated.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      })}{' '}
      UTC · automated, not part of the verified dataset.
    </p>
  );
}

/** The Markets tab: every instrument, grouped by commodity family, each one starrable. */
export default function MarketsPanel({ market, watchlist }) {
  if (market.status !== 'ok') {
    return (
      <section className="panel">
        <h2 className="eyebrow">Markets</h2>
        <MarketUnavailable market={market} />
      </section>
    );
  }
  const all = Object.values(market.data.instruments);
  const groups = COMMODITIES.map((c) => ({
    family: c,
    items: all.filter((i) => i.commodity === c.id),
  })).filter((g) => g.items.length);

  return (
    <section className="panel" aria-label="Market prices">
      {groups.map(({ family, items }) => (
        <div key={family.id} className="markets__group">
          <h2 className="eyebrow markets__family">
            <span className="markets__swatch" style={{ background: family.color }} aria-hidden="true" />
            {family.label}
          </h2>
          <ul className="prices">
            {items.map((inst) => (
              <PriceRow
                key={inst.instrument_id}
                inst={inst}
                starred={watchlist.isPrice(inst.instrument_id)}
                onToggleStar={watchlist.togglePrice}
              />
            ))}
          </ul>
        </div>
      ))}
      <MarketNote data={market.data} />
    </section>
  );
}
