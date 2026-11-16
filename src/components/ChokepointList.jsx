import { CHOKEPOINTS, ROUTES } from '../data/index.js';
import { STATUS } from '../data/commodities.js';
import { SITUATION_AS_OF } from '../data/timeframes.js';
import StatusTag from './StatusTag.jsx';

const SEVERITY = { disrupted: 0, reduced: 1, rerouted: 2, new: 3, normal: 4 };

const routeCount = (id) => ROUTES.filter((r) => r.chokepoints.includes(id)).length;

/** Most affected first, then by the number of corridors that depend on the strait. */
const ORDERED = [...CHOKEPOINTS]
  .map((cp) => ({ cp, routes: routeCount(cp.id) }))
  .sort(
    (a, b) =>
      (SEVERITY[a.cp.status] ?? 9) - (SEVERITY[b.cp.status] ?? 9) || b.routes - a.routes
  );

/**
 * The straits and canals as a list: on the map they are ten small circles, easy
 * to miss, while they are what a reader of a supply shock looks for first.
 */
export default function ChokepointList({ onSelect }) {
  return (
    <section className="panel chokelist">
      <h2 className="eyebrow">Chokepoints · situation as of {SITUATION_AS_OF}</h2>
      <p className="chokelist__lead">
        The straits and canals the corridors depend on, most affected first.
      </p>
      <ul className="chokelist__items">
        {ORDERED.map(({ cp, routes }) => {
          const status = STATUS[cp.status];
          return (
            <li key={cp.id}>
              <button
                type="button"
                className="chokecard"
                onClick={() => onSelect(cp.id)}
                style={{ '--status-color': status.color }}
              >
                <span className="chokecard__head">
                  <span className="chokecard__name">{cp.name}</span>
                  <StatusTag status={cp.status} />
                </span>
                {cp.situation && <span className="chokecard__now">{cp.situation}</span>}
                <span className="chokecard__ref">
                  <span className="routecard__period">2025</span>
                  {cp.leadFact?.statement}
                </span>
                <span className="chokecard__foot">
                  {routes} corridor{routes === 1 ? '' : 's'} on this map cross
                  {routes === 1 ? 'es' : ''} it
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
