/**
 * Readings derived from the routes themselves — no new figure, only counts of
 * what is drawn. Every consumer labels them "on this map": 83 corridors are a
 * selection, not a census of world trade.
 */

const byWeight = (a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'en');

/** Same commodity, and the same metal when the route carries a sub-family. */
const sameGood = (a, b) =>
  a.commodity === b.commodity && (a.sub ?? null) === (b.sub ?? null);

/**
 * What a buyer or a seller can turn to when this corridor is cut: the other
 * origins drawn into the same destination country, and the other destinations
 * drawn out of the same origin country, for the same commodity.
 */
export function alternativesFor(route, routes) {
  const others = routes.filter((r) => r.id !== route.id && sameGood(r, route));
  return {
    suppliers: others
      .filter(
        (r) => r.toCountry === route.toCountry && r.fromCountry !== route.fromCountry
      )
      .sort(byWeight),
    outlets: others
      .filter(
        (r) => r.fromCountry === route.fromCountry && r.toCountry !== route.toCountry
      )
      .sort(byWeight),
  };
}

const tally = (items) => {
  const counts = new Map();
  for (const k of items) if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id, 'en'));
};

/** One country across the whole map: what it ships, receives and depends on. */
export function countryProfile(country, routes) {
  const ships = routes.filter((r) => r.fromCountry === country);
  const receives = routes.filter((r) => r.toCountry === country);
  const all = [...new Set([...ships, ...receives])];
  return {
    ships,
    receives,
    total: all.length,
    shipsFamilies: tally(ships.map((r) => r.commodity)),
    receivesFamilies: tally(receives.map((r) => r.commodity)),
    chokepoints: tally(all.flatMap((r) => r.chokepoints)),
    statuses: tally(all.map((r) => r.status)),
    openSea: all.filter((r) => r.chokepoints.length === 0).length,
  };
}

/** What depends on a chokepoint: families, loading and discharge countries. */
export function chokepointExposure(routes) {
  return {
    families: tally(routes.map((r) => r.commodity)),
    loading: tally(routes.map((r) => r.fromCountry)),
    discharging: tally(routes.map((r) => r.toCountry)),
    affected: routes.filter((r) => r.status !== 'normal').length,
  };
}
