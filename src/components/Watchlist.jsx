import { ROUTE_BY_ID } from '../data/index.js';
import RouteList from './RouteList.jsx';
import { MarketNote, MarketUnavailable, PriceRow } from './MarketsPanel.jsx';

/**
 * The Watchlist tab: the routes and prices the user starred, kept in this
 * browser. Routes can be isolated on the map in one click.
 */
export default function Watchlist({
  watchlist,
  market,
  onSelectRoute,
  onHoverRoute,
  selectedRouteId,
  watchOnly,
  onWatchOnlyChange,
}) {
  const routes = watchlist.routes.map((id) => ROUTE_BY_ID[id]).filter(Boolean);
  const prices =
    market.status === 'ok'
      ? watchlist.prices.map((id) => market.data.instruments[id]).filter(Boolean)
      : [];
  const nothing = !routes.length && !watchlist.prices.length;

  return (
    <section className="panel" aria-label="Watchlist">
      {nothing && (
        <div className="watch__empty">
          <p className="watch__emptytitle">Your watchlist is empty.</p>
          <p>
            Click ☆ next to a route in <strong>Routes</strong>, or next to a price in{' '}
            <strong>Markets</strong>, to follow it here. The watchlist is saved in this
            browser only.
          </p>
        </div>
      )}

      {!nothing && (
        <>
          <div className="watch__head">
            <h2 className="eyebrow">Routes ({routes.length})</h2>
            {routes.length > 0 && (
              <button
                type="button"
                className={`toggle${watchOnly ? ' is-active' : ''}`}
                onClick={() => onWatchOnlyChange(!watchOnly)}
                aria-pressed={watchOnly}
              >
                {watchOnly ? '● Map: watchlist only' : '○ Show only these on the map'}
              </button>
            )}
          </div>
          <RouteList
            routes={routes}
            selectedId={selectedRouteId}
            onSelect={onSelectRoute}
            onHover={onHoverRoute}
            watchlist={watchlist}
            emptyText="No route starred yet."
          />

          <h2 className="eyebrow watch__section">Prices ({watchlist.prices.length})</h2>
          {market.status !== 'ok' && watchlist.prices.length > 0 ? (
            <MarketUnavailable market={market} />
          ) : prices.length ? (
            <>
              <ul className="prices">
                {prices.map((inst) => (
                  <PriceRow
                    key={inst.instrument_id}
                    inst={inst}
                    showReference
                    starred
                    onToggleStar={watchlist.togglePrice}
                  />
                ))}
              </ul>
              <MarketNote data={market.data} />
            </>
          ) : (
            <p className="empty">No price starred yet.</p>
          )}
        </>
      )}
    </section>
  );
}
