/**
 * Every fact belongs to one of two periods, and the interface never mixes them.
 *
 * `baseline` — the reference figures that size a corridor: 2025 (or the latest
 * pre-war data), before the Strait of Hormuz closed on 28 February 2026.
 * `current` — what has happened since: closures, blockades, reroutings.
 *
 * Update SITUATION_AS_OF whenever the `current` facts and statuses are reviewed.
 */
export const WAR_START = '28 February 2026';
export const SITUATION_AS_OF = '14 September 2026';

export const TIMEFRAMES = {
  baseline: {
    label: '2025 reference',
    heading: 'Reference figures — 2025, before the war',
    hint: 'Measured before the Strait of Hormuz closed on 28 February 2026',
  },
  current: {
    label: 'Since the war',
    heading: `Current situation — as of ${SITUATION_AS_OF}`,
    hint: 'Describes the situation since the Strait of Hormuz closed on 28 February 2026',
  },
};
