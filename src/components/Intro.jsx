import { useState } from 'react';
import { SITUATION_AS_OF } from '../data/timeframes.js';

const KEY = 'commoditymap:intro-dismissed:v1';

function readDismissed() {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Three lines on how to read the map, shown until dismissed. A first-time
 * visitor otherwise has to guess what colour, thickness and dashes mean.
 */
export default function Intro() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      // Storage unavailable: the card simply comes back on the next visit.
    }
  };

  return (
    <section className="intro" aria-label="How to read this map">
      <h2 className="eyebrow">How to read this map</h2>
      <ol className="intro__list">
        <li>
          <strong>One line, one sea corridor.</strong> Colour is the commodity, thickness
          the order of magnitude; the hollow circle is where it loads, the disc where it
          discharges.
        </li>
        <li>
          <strong>Two periods, kept apart.</strong> Figures are a 2025 reference; dashed
          lines and status tags show what the war has changed, as of {SITUATION_AS_OF}.
        </li>
        <li>
          <strong>Everything is sourced.</strong> Click a line, a chokepoint or a row to
          read its facts, each with its source and the exact quote.
        </li>
      </ol>
      <button type="button" className="intro__dismiss" onClick={dismiss}>
        Got it
      </button>
    </section>
  );
}
