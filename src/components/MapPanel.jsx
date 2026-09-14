import { useState } from 'react';
import {
  COMMODITIES,
  COMMODITY_BY_ID,
  STATUS,
  STATUS_ORDER,
} from '../data/commodities.js';

/**
 * A single panel at the foot of the map: legend and layers together.
 * Three separate floating boxes cluttered the map; only one remains.
 */
export default function MapPanel({
  activeCommodity,
  layers,
  onToggleLayer,
  shown,
  hidden,
}) {
  // Open by default: with eight series on screen the legend carries colour
  // identity — collapsing it would leave hue to speak alone.
  const [open, setOpen] = useState(true);
  const keyed =
    activeCommodity === 'all'
      ? COMMODITIES
      : [COMMODITY_BY_ID[activeCommodity]];

  return (
    <div className={`mappanel${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="mappanel__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Legend &amp; layers</span>
        <span className="mappanel__chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>

      {open && (
        <div className="mappanel__body">
          <div className="mappanel__group">
            <h4>Commodity</h4>
            <ul
              className={`keylist${keyed.length > 4 ? ' keylist--two' : ''}`}
            >
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
          </div>

          <div className="mappanel__group">
            <h4>Corridor status · August 2026</h4>
            <ul className="keylist">
              {STATUS_ORDER.map((id) => {
                const s = STATUS[id];
                return (
                  <li key={id}>
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
                    {s.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mappanel__group">
            <h4>Layers</h4>
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
          </div>

          {hidden > 0 && (
            <p className="mappanel__hint">
              {shown} corridor{shown === 1 ? '' : 's'} shown ·{' '}
              <strong>
                {hidden} hidden
              </strong>{' '}
              at this zoom level. Zoom in to reveal the secondary corridors.
            </p>
          )}

          <p className="mappanel__note">
            Thickness = order of magnitude of the corridor, not a measurement.
            Hollow circle at origin, filled disc at destination.
          </p>
        </div>
      )}
    </div>
  );
}
