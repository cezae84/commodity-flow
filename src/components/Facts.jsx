import { SCOPES } from '../data/scopes.js';
import { TIMEFRAMES } from '../data/timeframes.js';

export function ScopeBadge({ scope }) {
  const s = SCOPES[scope] ?? { label: scope, hint: '' };
  return (
    <span className={`scope scope--${scope}`} title={s.hint}>
      {s.label}
    </span>
  );
}

export function TimeframeBadge({ timeframe }) {
  const t = TIMEFRAMES[timeframe];
  return (
    <span className={`timeframe timeframe--${timeframe}`} title={t.hint}>
      {t.label}
    </span>
  );
}

export function SourceLink({ source }) {
  if (!source) return <span className="fact__missing">Source missing</span>;
  return (
    <a href={source.url} target="_blank" rel="noreferrer" className="fact__source">
      {source.publisher}
      <span className="fact__source-title"> — {source.title}</span>
      {source.published && <span className="fact__date"> ({source.published})</span>}
    </a>
  );
}

/** One sourced fact: statement, source link and, on demand, the verbatim quote. */
export function FactCard({ fact, emphasis = false, showTimeframe = false }) {
  if (!fact) return null;
  return (
    <li className={`fact fact--${fact.timeframe}${emphasis ? ' fact--lead' : ''}`}>
      <div className="fact__head">
        {showTimeframe && <TimeframeBadge timeframe={fact.timeframe} />}
        <ScopeBadge scope={fact.scope} />
        {fact.period && <span className="fact__period">{fact.period}</span>}
      </div>
      <p className="fact__statement">{fact.statement}</p>
      <p className="fact__sourceline">
        <SourceLink source={fact.source} />
      </p>
      <details className="fact__evidence">
        <summary>Show the quote</summary>
        <blockquote className="fact__quote">“{fact.quote}”</blockquote>
        {fact.note && <p className="fact__note">{fact.note}</p>}
        <p className="fact__meta">
          {fact.verification === 'manual'
            ? 'Quote checked by hand (page rendered by script)'
            : 'Quote matched against the source page'}
          {fact.checkedOn && ` · checked ${fact.checkedOn}`} · id <code>{fact.id}</code>
        </p>
      </details>
    </li>
  );
}

export function FactList({ facts }) {
  if (!facts.length) return null;
  return (
    <ul className="facts">
      {facts.map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}
    </ul>
  );
}
