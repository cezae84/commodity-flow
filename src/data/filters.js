/** Directions offered by the country filter. */
export const DIRECTIONS = [
  { id: 'from', label: 'Departing' },
  { id: 'to', label: 'Arriving' },
  { id: 'either', label: 'Either way' },
];

/** Does this route touch `country` in the given direction? */
export function matchesCountry(route, country, direction) {
  if (!country) return true;
  if (direction === 'from') return route.fromCountry === country;
  if (direction === 'to') return route.toCountry === country;
  return route.fromCountry === country || route.toCountry === country;
}

/**
 * Countries appearing in `routes` for a direction, with their route counts.
 * Counting against the routes currently in play keeps the list honest: a
 * country that no longer has any route under the active commodity filter is
 * simply not offered.
 */
export function countriesFor(routes, direction) {
  const counts = new Map();
  for (const r of routes) {
    const keys =
      direction === 'from'
        ? [r.fromCountry]
        : direction === 'to'
          ? [r.toCountry]
          : [...new Set([r.fromCountry, r.toCountry])];
    for (const k of keys) {
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => a.country.localeCompare(b.country, 'en'));
}
