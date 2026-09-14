import {
  COMMODITIES,
  SUBFILTERS,
  SUBFILTER_GROUPS,
} from '../data/commodities.js';

/**
 * A vertical list rather than wrapping pills: the labels are long, and a single
 * column scans at a glance without the layout shifting between filters.
 * Sub-families open beneath their own row, never anywhere else.
 */
export default function CommodityFilter({
  active,
  onChange,
  counts,
  total,
  activeSub,
  onChangeSub,
  subCounts,
}) {
  const subs = SUBFILTERS[active] ?? null;

  const groups = subs
    ? [...new Set(subs.map((s) => s.group ?? 'autres'))].map((g) => ({
        id: g,
        label: SUBFILTER_GROUPS[g] ?? null,
        items: subs.filter((s) => (s.group ?? 'autres') === g),
      }))
    : [];

  return (
    <section className="filter">
      <h2 className="eyebrow">Commodity</h2>

      <ul className="filterlist" role="group" aria-label="Filter by commodity">
        <li>
          <button
            type="button"
            className={`filterrow filterrow--all${
              active === 'all' ? ' is-active' : ''
            }`}
            onClick={() => onChange('all')}
            aria-pressed={active === 'all'}
          >
            <span className="filterrow__label">All families</span>
            <span className="filterrow__count">{total}</span>
          </button>
        </li>

        {COMMODITIES.map((c) => {
          const isActive = active === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`filterrow${isActive ? ' is-active' : ''}`}
                onClick={() => onChange(isActive ? 'all' : c.id)}
                aria-pressed={isActive}
                style={{ '--row-color': c.color }}
              >
                <span className="filterrow__swatch" aria-hidden="true" />
                <span className="filterrow__label">{c.label}</span>
                <span className="filterrow__count">{counts[c.id] ?? 0}</span>
              </button>

              {isActive && groups.length > 0 && (
                <div className="subfilter">
                  <button
                    type="button"
                    className={`subchip${!activeSub ? ' is-active' : ''}`}
                    onClick={() => onChangeSub(null)}
                    aria-pressed={!activeSub}
                  >
                    All
                  </button>

                  {groups.map((g) => (
                    <div key={g.id} className="subfilter__group">
                      {g.label && (
                        <span className="subfilter__label">{g.label}</span>
                      )}
                      <div className="subfilter__chips">
                        {g.items.map((s) => {
                          const on = activeSub === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`subchip${on ? ' is-active' : ''}`}
                              onClick={() => onChangeSub(on ? null : s.id)}
                              aria-pressed={on}
                            >
                              {s.label}
                              <span className="subchip__count">
                                {subCounts[s.id] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
