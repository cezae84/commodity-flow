import { useMemo } from 'react';
import { CHOKEPOINT_BY_ID, ROUTES } from '../data/index.js';
import { COMMODITY_BY_ID } from '../data/commodities.js';
import { countryProfile } from '../data/insights.js';
import StatusTag from './StatusTag.jsx';

const SEVERITY = ['disrupted', 'reduced', 'rerouted', 'new'];

function Families({ items }) {
  return (
    <span className="profile__families">
      {items.map(({ id, count }) => {
        const c = COMMODITY_BY_ID[id];
        return (
          <span key={id} className="profile__family">
            <span
              className="profile__swatch"
              style={{ background: c.color }}
              aria-hidden="true"
            />
            {c.short} <span className="profile__n">{count}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * A country read across the whole map, whatever the other filters say: what it
 * ships, what it receives, which straits its corridors depend on and what the
 * war has changed. Counts of drawn corridors only — never volumes.
 */
export default function CountryProfile({ country, onSelectChokepoint }) {
  const p = useMemo(() => countryProfile(country, ROUTES), [country]);
  if (p.total === 0) return null;
  const changed = SEVERITY.map((id) => p.statuses.find((s) => s.id === id)).filter(
    Boolean
  );

  return (
    <section className="profile" aria-label={`${country} on this map`}>
      <h3 className="eyebrow">{country} on this map</h3>
      <dl className="profile__rows">
        {p.ships.length > 0 && (
          <div>
            <dt>
              Ships <span className="profile__n">{p.ships.length}</span>
            </dt>
            <dd>
              <Families items={p.shipsFamilies} />
            </dd>
          </div>
        )}
        {p.receives.length > 0 && (
          <div>
            <dt>
              Receives <span className="profile__n">{p.receives.length}</span>
            </dt>
            <dd>
              <Families items={p.receivesFamilies} />
            </dd>
          </div>
        )}
        <div>
          <dt>Now</dt>
          <dd>
            {changed.length === 0 ? (
              'All its corridors run normally.'
            ) : (
              <span className="profile__families">
                {changed.map(({ id, count }) => (
                  <span key={id} className="profile__family">
                    <StatusTag status={id} /> <span className="profile__n">{count}</span>
                  </span>
                ))}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {p.chokepoints.length > 0 ? (
        <>
          <h4 className="profile__sub">Chokepoint dependence</h4>
          <ul className="cp-list">
            {p.chokepoints.map(({ id, count }) => {
              const cp = CHOKEPOINT_BY_ID[id];
              if (!cp) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="cp-row"
                    onClick={() => onSelectChokepoint(id)}
                  >
                    <span className="cp-row__name">{cp.name}</span>
                    {cp.status !== 'normal' && <StatusTag status={cp.status} />}
                    <span className="profile__n">
                      {count} of {p.total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="profile__note">None of its corridors crosses a chokepoint.</p>
      )}
      <p className="profile__note">
        Counts the corridors drawn on this map in both directions, not volumes.
      </p>
    </section>
  );
}
