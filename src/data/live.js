import { useEffect, useState } from 'react';

/**
 * Live market prices.
 *
 * Not part of the verified dataset: machine-fetched every 30 minutes by
 * .github/workflows/update-prices.yml (scripts/live/fetch_prices.py) and
 * published as prices.json on the repository's `live-data` branch. The page
 * reads that file at load and every few minutes, so new prices need no redeploy.
 *
 * URL: VITE_LIVE_DATA_URL at build time (vite.config.js derives it from the
 * linked GitHub repository on Netlify). In `npm run dev` it defaults to
 * /live/prices.json, served from .live/ after `npm run prices`.
 * With no URL, or offline (standalone file), the markets panel simply stays hidden.
 */
export const LIVE_DATA_URL =
  import.meta.env.VITE_LIVE_DATA_URL || (import.meta.env.DEV ? '/live/prices.json' : '');

const REFRESH_MS = 5 * 60 * 1000;

function isValid(data) {
  return (
    data &&
    typeof data.generated_at === 'string' &&
    data.instruments &&
    typeof data.instruments === 'object' &&
    Object.values(data.instruments).every(
      (i) => typeof i.value === 'number' && Number.isFinite(i.value) && i.value > 0
    )
  );
}

/** Fetches prices.json on mount and every five minutes; keeps the last good copy. */
export function useMarketPrices() {
  const [state, setState] = useState({ status: LIVE_DATA_URL ? 'loading' : 'off', data: null });

  useEffect(() => {
    if (!LIVE_DATA_URL) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        // Cache-busting query: raw.githubusercontent.com caches for five minutes.
        const url = `${LIVE_DATA_URL}${LIVE_DATA_URL.includes('?') ? '&' : '?'}t=${Math.floor(
          Date.now() / REFRESH_MS
        )}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isValid(data)) throw new Error('unexpected prices.json format');
        if (!cancelled) setState({ status: 'ok', data });
      } catch {
        if (!cancelled) setState((prev) => (prev.data ? prev : { status: 'error', data: null }));
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return state;
}

/** Instruments of one commodity family (all when `commodity` is 'all'), in file order. */
export function instrumentsFor(data, commodity) {
  if (!data) return [];
  const all = Object.values(data.instruments);
  return commodity === 'all' ? all : all.filter((i) => i.commodity === commodity);
}

/**
 * With every family selected, one headline instrument per family (the first
 * listed in instruments.csv) keeps the panel short.
 */
export function headlineInstruments(data) {
  if (!data) return [];
  const seen = new Set();
  return Object.values(data.instruments).filter((i) => {
    if (seen.has(i.commodity)) return false;
    seen.add(i.commodity);
    return true;
  });
}

/** 16,632 · 106.15 · 6.393 — precision follows magnitude. */
export function formatPrice(v) {
  const digits = v >= 1000 ? 0 : v >= 10 ? 2 : 3;
  return v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPct(p) {
  if (p == null) return '';
  return `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p).toFixed(2)}%`;
}

/** "14 Sep, 20:08 UTC" for intraday quotes, "Jul 2026" for monthly averages. */
export function formatAsOf(inst) {
  if (inst.cadence === 'monthly') {
    const d = new Date(`${inst.as_of}T00:00:00Z`);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  const d = new Date(inst.as_of);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

/** Percentage of the latest value against the 2025 average, or null. */
export function vsReference(inst) {
  return inst.avg_reference ? ((inst.value - inst.avg_reference) / inst.avg_reference) * 100 : null;
}
