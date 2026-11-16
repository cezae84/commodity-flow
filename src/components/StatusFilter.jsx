import { STATUS } from '../data/commodities.js';

/** Most severe first: the reader comes for what is broken, not for what works. */
const ORDER = ['disrupted', 'reduced', 'rerouted', 'new', 'normal'];

/**
 * One row of chips that narrows the list — and therefore the map — to a single
 * current status. Each chip carries its icon, its label and the number of
 * routes it would leave; a status with no route under the other filters is not
 * offered.
 */
export default function StatusFilter({ active, onChange, counts, total }) {
  const offered = ORDER.filter((id) => (counts[id] ?? 0) > 0 || id === active);
  if (offered.length < 2 && !active) return null;

  return (
    <div className="statusfilter" role="group" aria-label="Filter by current situation">
      <span className="statusfilter__label">Situation now</span>
      <div className="statusfilter__chips">
        <button
          type="button"
          className={`statuschip${!active ? ' is-active' : ''}`}
          onClick={() => onChange(null)}
          aria-pressed={!active}
        >
          All
          <span className="statuschip__count">{total}</span>
        </button>
        {offered.map((id) => {
          const s = STATUS[id];
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              className={`statuschip${on ? ' is-active' : ''}`}
              onClick={() => onChange(on ? null : id)}
              aria-pressed={on}
              title={s.label}
              style={{ '--status-color': s.color }}
            >
              <span className="statuschip__icon" aria-hidden="true">
                {s.icon}
              </span>
              {s.short}
              <span className="statuschip__count">{counts[id] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
