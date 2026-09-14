import { useCallback, useEffect, useState } from 'react';

/**
 * The user's watchlist: favourite routes and favourite prices.
 *
 * Stored in this browser only (localStorage) — no account, nothing leaves the
 * device. Storage can be unavailable (private windows, blocked site data), so
 * every access is guarded and the watchlist then simply lasts for the visit.
 * Ids that no longer exist (a route removed from routes.csv) are ignored by the
 * views, not deleted, so they come back if the id returns.
 */
const KEY = 'commoditymap:watchlist:v1';
const EMPTY = { routes: [], prices: [] };

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return EMPTY;
    return {
      routes: Array.isArray(parsed.routes) ? parsed.routes.filter((x) => typeof x === 'string') : [],
      prices: Array.isArray(parsed.prices) ? parsed.prices.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(value) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep the in-memory watchlist */
  }
}

export function useWatchlist() {
  const [list, setList] = useState(() => (typeof window === 'undefined' ? EMPTY : read()));

  // Another tab changed the watchlist.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setList(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((kind, id) => {
    setList((prev) => {
      const has = prev[kind].includes(id);
      const next = { ...prev, [kind]: has ? prev[kind].filter((x) => x !== id) : [...prev[kind], id] };
      write(next);
      return next;
    });
  }, []);

  const toggleRoute = useCallback((id) => toggle('routes', id), [toggle]);
  const togglePrice = useCallback((id) => toggle('prices', id), [toggle]);

  return {
    routes: list.routes,
    prices: list.prices,
    isRoute: (id) => list.routes.includes(id),
    isPrice: (id) => list.prices.includes(id),
    toggleRoute,
    togglePrice,
  };
}
