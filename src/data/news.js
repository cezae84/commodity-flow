import { useLiveJson } from './live.js';

/**
 * AI market brief — last 24 hours.
 *
 * Not part of the verified dataset: written every two hours by
 * .github/workflows/update-news.yml (scripts/news/build_news.py), which asks
 * Claude to summarise public headlines and drops any item that cites no
 * headline or carries a number its headlines do not contain. Published as
 * news.json on the repository's `live-news` branch.
 *
 * URL: VITE_NEWS_DATA_URL at build time (vite.config.js derives it from the
 * linked GitHub repository on Netlify). In `npm run dev` it defaults to
 * /live/news.json, served from .live/ after `npm run news` (or `npm run news:demo`).
 * With no URL, or offline (standalone file), the panel stays hidden.
 */
export const NEWS_DATA_URL =
  import.meta.env.VITE_NEWS_DATA_URL || (import.meta.env.DEV ? '/live/news.json' : '');

const REFRESH_MS = 10 * 60 * 1000;
/** Older than this, the brief is shown as out of date whatever its status. */
export const STALE_AFTER_HOURS = 6;

export const NEWS_CATEGORIES = {
  oil: 'Oil',
  'gas-lng': 'Gas & LNG',
  'dry-bulk': 'Dry bulk',
  agri: 'Agri',
  metals: 'Metals',
  shipping: 'Shipping',
  geopolitics: 'Geopolitics',
};

const isSource = (s) => s && typeof s.url === 'string' && /^https?:\/\//.test(s.url) && typeof s.title === 'string';

function isValid(data) {
  return (
    data &&
    typeof data.generated_at === 'string' &&
    Array.isArray(data.items) &&
    data.items.every(
      (i) =>
        typeof i.headline === 'string' &&
        typeof i.summary === 'string' &&
        Array.isArray(i.sources) &&
        i.sources.length > 0 &&
        i.sources.every(isSource)
    )
  );
}

export function useNewsBrief() {
  return useLiveJson(NEWS_DATA_URL, isValid, REFRESH_MS, 'news.json');
}

/** "12 min ago" · "3 h ago" · "2 d ago". */
export function timeAgo(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

/** True when the brief shown was not written recently (failed runs, paused workflow). */
export function isOutdated(data, now = Date.now()) {
  const written = new Date(data.brief_generated_at || data.generated_at).getTime();
  return data.status === 'stale' || now - written > STALE_AFTER_HOURS * 3600 * 1000;
}
