import { useState } from 'react';
import { NEWS_CATEGORIES, isOutdated, timeAgo } from '../data/news.js';

const OPEN_KEY = 'commoditiesroutes:newspanel-open:v1';

function readOpen() {
  try {
    return window.localStorage.getItem(OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeOpen(open) {
  try {
    window.localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    // Private mode or blocked storage: the panel simply opens next time.
  }
}

const newest = (sources) =>
  sources.reduce((a, s) => (!a || s.published_at > a ? s.published_at : a), null);

function Sources({ sources }) {
  return (
    <p className="news__sources">
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noreferrer" title={s.title}>
            {s.publisher}
          </a>
        </span>
      ))}
    </p>
  );
}

/** The brief itself: used in the floating panel on desktop and in the sidebar on small screens. */
export function NewsBrief({ news }) {
  if (news.status !== 'ok') {
    return (
      <p className="news__empty">
        {news.status === 'loading' ? 'Loading the market brief…' : 'The market brief is not available right now.'}
      </p>
    );
  }
  const { data } = news;
  const written = data.brief_generated_at || data.generated_at;

  return (
    <div className="news">
      {data.demo && <p className="news__warning">Demo data — offline sample, not real news.</p>}
      {!data.demo && isOutdated(data) && (
        <p className="news__warning">
          Not refreshed since {timeAgo(written)} — showing the last brief.
        </p>
      )}

      {data.overview && (
        <div className="news__overview">
          <p>{data.overview.text}</p>
          <Sources sources={data.overview.sources} />
        </div>
      )}

      <ol className="news__list">
        {data.items.map((item) => (
          <li key={item.headline} className="news__item">
            <div className="news__meta">
              <span className="news__cat">{NEWS_CATEGORIES[item.category] ?? item.category}</span>
              <span>{timeAgo(newest(item.sources))}</span>
            </div>
            <h4 className="news__headline">{item.headline}</h4>
            <p className="news__summary">{item.summary}</p>
            <Sources sources={item.sources} />
          </li>
        ))}
      </ol>

      <p className="news__note">
        AI-generated summary of public headlines{data.model?.startsWith('claude-haiku') ? ' (Claude Haiku)' : ''},
        written {timeAgo(written)} from the last {data.window_hours} hours. Each item links to the articles it is based
        on — read them before relying on it. Not part of the verified dataset.
      </p>
    </div>
  );
}

/** Floating, collapsible panel on the right of the map. Hidden when there is no feed. */
export default function NewsPanel({ news }) {
  const [open, setOpen] = useState(readOpen);
  if (news.status !== 'ok') return null;

  const toggle = () => {
    setOpen(!open);
    writeOpen(!open);
  };
  const written = news.data.brief_generated_at || news.data.generated_at;

  return (
    <aside className={`newspanel${open ? ' is-open' : ''}`} aria-label="Market brief, last 24 hours">
      <button type="button" className="newspanel__toggle" onClick={toggle} aria-expanded={open}>
        <span>
          Market brief · 24 h <span className="newspanel__ai">AI</span>
        </span>
        <span className="newspanel__when">
          {timeAgo(written)} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {open && (
        <div className="newspanel__body">
          <NewsBrief news={news} />
        </div>
      )}
    </aside>
  );
}
