/**
 * The 8 commodity families covered by the map.
 *
 * Editorial palette designed for a light basemap (CARTO Positron water,
 * #d4dadc). The hue order was picked among validated permutations: colour-vision
 * separation ΔE 11.5 on the worst adjacent pair, normal-vision floor ΔE 18.5,
 * contrast >= 3:1 against water (teal sits at 2.98 — hence the always-visible
 * legend and tooltips, which name the family in words).
 *
 * Do not reorder and do not add a 9th hue: the order IS the colour-blindness
 * safety mechanism, not an aesthetic choice.
 */
export const COMMODITIES = [
  {
    id: 'crude',
    label: 'Crude oil',
    short: 'Crude',
    color: '#2C6FB5',
    unit: 'Mb/d',
    blurb:
      'Flows are polarised Persian Gulf → Asia through Hormuz and Malacca, with a second Russia → India and China axis since the war in Ukraine.',
  },
  {
    id: 'products',
    label: 'Refined products',
    short: 'Products',
    color: '#C2410C',
    unit: 'Mb/d',
    blurb:
      'Diesel, jet fuel, naphtha, fuel oil. Europe replaced Russian diesel with cargoes from the Middle East, India and the United States.',
  },
  {
    id: 'lng',
    label: 'LNG',
    short: 'LNG',
    color: '#008B7D',
    unit: 'Mt/yr',
    blurb:
      'A record year for LNG trade in 2025, dominated by the United States, Qatar and Australia.',
  },
  {
    id: 'coal',
    label: 'Coal',
    short: 'Coal',
    color: '#A46A08',
    unit: 'Mt/yr',
    blurb:
      'Indonesia, Australia and Russia supply the big Asian importers, led by China and India; trade contracted in 2025.',
  },
  {
    id: 'fertilizer',
    label: 'Fertilizers',
    short: 'Fertilizer',
    color: '#9C3070',
    unit: 'Mt/yr',
    blurb:
      'Urea, potash, phosphates. Canada leads potash exports, Morocco holds most phosphate reserves, and a large share of traded urea comes from inside the Gulf.',
  },
  {
    id: 'grain',
    label: 'Grain & oilseeds',
    short: 'Grain',
    color: '#4F7A21',
    unit: 'Mt/yr',
    blurb:
      'Soybeans, corn, wheat, barley, canola. Brazil ships record soybean volumes to China and has overtaken the United States as China’s corn supplier.',
  },
  {
    id: 'metals',
    label: 'Metals & ores',
    short: 'Metals',
    color: '#6A54C0',
    unit: 'Mt/yr',
    blurb:
      'Base metals — copper, aluminium, nickel, zinc and tin — from raw ore to refined metal, plus the critical minerals. Nearly every one of these corridors converges on China.',
  },
  {
    id: 'iron',
    label: 'Iron ore',
    short: 'Iron ore',
    color: '#B02E2E',
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
    color: '#0F7B37',
    icon: '●',
    dash: null,
  },
  reduced: {
    id: 'reduced',
    label: 'Reduced traffic',
    color: '#B07A0A',
    icon: '▽',
    dash: '14 5',
  },
  rerouted: {
    id: 'rerouted',
    label: 'Rerouted via the Cape of Good Hope',
    color: '#C05621',
    icon: '↻',
    dash: '10 6',
  },
  disrupted: {
    id: 'disrupted',
    label: 'Halted or near standstill',
    color: '#B3261E',
    icon: '✕',
    dash: '2 8',
  },
  new: {
    id: 'new',
    label: 'Recently opened corridor',
    color: '#1F6FB2',
    icon: '✦',
    dash: '1 6',
  },
};

/** Legend order for statuses, from calmest to most severe. */
export const STATUS_ORDER = ['normal', 'reduced', 'rerouted', 'disrupted', 'new'];
