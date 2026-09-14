import {
  COMMODITY_BY_ID,
  STATUS,
  SUBFILTER_BY_ID,
} from '../data/commodities.js';

export default function RouteList({ routes, selectedId, onSelect, onHover }) {
  if (!routes.length) {
    return <p className="empty">No route matches this filter.</p>;
  }

  return (
    <ul className="routelist">
      {routes.map((route) => {
        const commodity = COMMODITY_BY_ID[route.commodity];
        const status = STATUS[route.status];
        const sub = route.sub ? SUBFILTER_BY_ID[route.sub] : null;
        const isSelected = selectedId === route.id;

        return (
          <li key={route.id}>
            <button
              type="button"
              className={`routecard${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelect(route.id)}
              onMouseEnter={() => onHover?.(route.id)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(route.id)}
              onBlur={() => onHover?.(null)}
              aria-pressed={isSelected}
              style={{ '--row-color': commodity.color }}
            >
              <span className="routecard__bar" aria-hidden="true" />
              <span className="routecard__body">
                <span className="routecard__name">{route.name}</span>
                <span className="routecard__metric">
                  <span className="routecard__period">2025</span>
                  {route.leadFact?.statement}
                </span>
                <span className="routecard__foot">
                  <span className="routecard__tag">
                    {sub ? sub.label : commodity.short}
                  </span>
                  <span
                    className="routecard__rank"
                    aria-label={`Order of magnitude ${route.weight} of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`tick${n <= route.weight ? ' is-on' : ''}`}
                      />
                    ))}
                  </span>
                  {route.status !== 'normal' && (
                    <span
                      className="routecard__status"
                      style={{ '--status-color': status.color }}
                      title="Situation since the war (as of the date shown in the header)"
                    >
                      Now: {status.icon} {status.label}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
