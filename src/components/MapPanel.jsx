import { useEffect, useRef, useState } from 'react';
import { SITUATION_AS_OF } from '../data/timeframes.js';
import {
  COMMODITIES,
  COMMODITY_BY_ID,
  STATUS,
  STATUS_ORDER,
} from '../data/commodities.js';
import { ROUTES, CHOKEPOINTS } from '../data/index.js';

/** Only the statuses that actually occur: a key for something absent is noise. */
const USED_STATUSES = STATUS_ORDER.filter(
  (id) =>
    ROUTES.some((r) => r.status === id) || CHOKEPOINTS.some((c) => c.status === id)
);

/**
 * The legend as a strip along the foot of the map. With eight series on screen
 * the colour key has to stay visible — but as two short rows, not a box over
 * the middle of the Indian Ocean. Layers open on demand above the strip.
 */
export default function MapPanel({
  activeCommodity,
  layers,
  onToggleLayer,
  shown,
  hidden,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const keyed =
    activeCommodity === 'all'
      ? COMMODITIES
      : [COMMODITY_BY_ID[activeCommodity]];

  // The layers menu closes on a click anywhere else, like any menu.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div className="legend" ref={rootRef}>
      <div className="legend__rows">
        <ul className="legend__keys" aria-label="Commodity colours">
          {keyed.map((c) => (
            <li key={c.id}>
              <span
                className="key-line"
                style={{ background: c.color }}
                aria-hidden="true"
              />
              {c.label}
            </li>
          ))}
        </ul>

        <ul className="legend__keys legend__keys--status" aria-label="Corridor status">
          <li className="legend__title">Now · {SITUATION_AS_OF}</li>
          {USED_STATUSES.map((id) => {
            const s = STATUS[id];
            return (
              <li key={id} title={s.label}>
                <span
                  className="key-dash"
                  style={{
                    borderTopColor: s.color,
                    borderTopStyle: s.dash ? 'dashed' : 'solid',
                  }}
                  aria-hidden="true"
                />
                <span style={{ color: s.color }} aria-hidden="true">
                  {s.icon}
                </span>
                {s.short}
              </li>
            );
          })}
        </ul>

        {hidden > 0 && (
          <p className="legend__hint">
            <strong>
              {shown} of {shown + hidden}
            </strong>{' '}
            corridors drawn at this zoom — zoom in to reveal the smaller ones
          </p>
        )}
      </div>

      <div className="legend__layers">
        <button
          type="button"
          className={`legend__toggle${open ? ' is-active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Layers <span aria-hidden="true">{open ? '▾' : '▴'}</span>
        </button>

        {open && (
          <div className="legend__pop">
            <ul className="layerlist">
              {layers.map(({ id, label, value }) => (
                <li key={id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onToggleLayer(id, e.target.checked)}
                    />
                    <span className="check__box" aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="legend__note">
              Thickness is the corridor’s order of magnitude, not a measurement.
              Hollow circle at the origin, filled disc at the destination.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
