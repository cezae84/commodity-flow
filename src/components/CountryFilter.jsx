import { DIRECTIONS } from '../data/filters.js';

/**
 * Country filter, in a single row.
 *
 * Two native selects rather than a custom dropdown: with 36 countries a native
 * control stays compact, is keyboard-navigable and gets type-ahead for free —
 * and it adds one row to the sidebar instead of a second long list.
 */
export default function CountryFilter({
  direction,
  onDirectionChange,
  country,
  onCountryChange,
  options,
}) {
  return (
    <div className="countryfilter">
      <label className="select">
        <span className="sr-only">Direction</span>
        <select
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value)}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="select">
        <span className="sr-only">Country</span>
        <select
          value={country ?? ''}
          onChange={(e) => onCountryChange(e.target.value || null)}
        >
          <option value="">Any country</option>
          {options.map((o) => (
            <option key={o.country} value={o.country}>
              {o.country} ({o.count})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
