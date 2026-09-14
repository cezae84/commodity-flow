/**
 * The 8 commodity families covered by the map.
 *
 * Palette stepped for the dark terminal theme on CARTO Dark Matter (water
 * #262626), validated with the dataviz palette validator in dark mode: every
 * hue inside the OKLCH L 0.48–0.67 band, chroma ≥ 0.10, worst adjacent
 * colour-vision separation ΔE 11.5 (coal ↔ LNG, protan), normal-vision floor
 * ΔE 17.4, contrast ≥ 3:1 against the water. Same hue families and order as the
 * former light palette.
 *
 * Do not reorder and do not add a 9th hue: the order IS the colour-blindness
 * safety mechanism, not an aesthetic choice.
 */
export const COMMODITIES = [
  {
    id: 'crude',
    label: 'Crude oil',
    short: 'Crude',
    color: '#4A90E2',
    unit: 'Mb/d',
    blurb:
      'Flows are polarised Persian Gulf → Asia through Hormuz and Malacca, with a second Russia → India and China axis since the war in Ukraine.',
  },
  {
    id: 'products',
    label: 'Refined products',
    short: 'Products',
    color: '#D9652F',
    unit: 'Mb/d',
    blurb:
      'Diesel, jet fuel, naphtha, fuel oil. Europe replaced Russian diesel with cargoes from the Middle East, India and the United States.',
  },
  {
    id: 'lng',
    label: 'LNG',
    short: 'LNG',
    color: '#19A089',
    unit: 'Mt/yr',
    blurb:
      'A record year for LNG trade in 2025, dominated by the United States, Qatar and Australia.',
  },
  {
    id: 'coal',
    label: 'Coal',
    short: 'Coal',
    color: '#B58924',
    unit: 'Mt/yr',
    blurb:
      'Indonesia, Australia and Russia supply the big Asian importers, led by China and India; trade contracted in 2025.',
  },
  {
    id: 'fertilizer',
    label: 'Fertilizers',
    short: 'Fertilizer',
    color: '#D35C9E',
    unit: 'Mt/yr',
    blurb:
      'Urea, potash, phosphates. Canada leads potash exports, Morocco holds most phosphate reserves, and a large share of traded urea comes from inside the Gulf.',
  },
  {
    id: 'grain',
    label: 'Grain & oilseeds',
    short: 'Grain',
    color: '#6FA83A',
    unit: 'Mt/yr',
    blurb:
      'Soybeans, corn, wheat, barley, canola. Brazil ships record soybean volumes to China and has overtaken the United States as China’s corn supplier.',
  },
  {
    id: 'metals',
    label: 'Metals & ores',
    short: 'Metals',
    color: '#8C7BE3',
    unit: 'Mt/yr',
    blurb:
      'Base metals — copper, aluminium, nickel, zinc and tin — from raw ore to refined metal, plus the critical minerals. Nearly every one of these corridors converges on China.',
  },
  {
    id: 'iron',
    label: 'Iron ore',
    short: 'Iron ore',
    color: '#E0605A',
    unit: 'Mt/yr',
    blurb:
      'Australia and Brazil supply most seaborne iron ore, and China absorbs most of it.',
  },
];

export const COMMODITY_BY_ID = Object.fromEntries(
  COMMODITIES.map((c) => [c.id, c])
);

/**
 * Sub-filters offered inside a family.
 *
 * Routes keep their family colour: a sub-filter narrows what is shown, it never
 * repaints the surviving lines. The identity of the metal is carried by the chip
 * label and by each route's detail card.
 */
export const SUBFILTERS = {
  metals: [
    { id: 'copper', label: 'Copper', group: 'base' },
    { id: 'aluminium', label: 'Aluminium & bauxite', group: 'base' },
    { id: 'nickel', label: 'Nickel', group: 'base' },
    { id: 'zinc', label: 'Zinc', group: 'base' },
    { id: 'tin', label: 'Tin', group: 'base' },
    { id: 'lithium', label: 'Lithium', group: 'critical' },
    { id: 'cobalt', label: 'Cobalt', group: 'critical' },
    { id: 'rareEarths', label: 'Rare earths', group: 'critical' },
    { id: 'ferroalloys', label: 'Manganese & chrome', group: 'critical' },
  ],
};

export const SUBFILTER_BY_ID = Object.fromEntries(
  Object.values(SUBFILTERS)
    .flat()
    .map((s) => [s.id, s])
);

/** Headings for sub-filter groups, shown in the filter panel. */
export const SUBFILTER_GROUPS = {
  base: 'Base metals',
  critical: 'Critical minerals',
};

/**
 * Operational status of a route.
 *
 * Status colours are reserved: they are never used as a series hue, and they
 * always ship with an icon and a label — never colour alone.
 */
export const STATUS = {
  normal: {
    id: 'normal',
    label: 'Normal traffic',
    color: '#2FB35A',
    icon: '●',
    dash: null,
  },
  reduced: {
    id: 'reduced',
    label: 'Reduced traffic',
    color: '#F2B21B',
    icon: '▽',
    dash: '14 5',
  },
  rerouted: {
    id: 'rerouted',
    label: 'Rerouted via the Cape of Good Hope',
    color: '#EC835A',
    icon: '↻',
    dash: '10 6',
  },
  disrupted: {
    id: 'disrupted',
    label: 'Halted or near standstill',
    color: '#F0524F',
    icon: '✕',
    dash: '2 8',
  },
  new: {
    id: 'new',
    label: 'Recently opened corridor',
    color: '#4FC3F7',
    icon: '✦',
    dash: '1 6',
  },
};

/** Legend order for statuses, from calmest to most severe. */
export const STATUS_ORDER = ['normal', 'reduced', 'rerouted', 'disrupted', 'new'];
