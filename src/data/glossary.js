/**
 * Plain-language definitions of the trade and shipping terms the map uses.
 * These are explanations, not sourced facts: they carry no figure, and the
 * Data view says so. Keep to terms a reader meets in the app or in the quotes it shows.
 */
export const GLOSSARY = [
  {
    id: 'map',
    label: 'How this map speaks',
    terms: [
      [
        'Corridor',
        'One commodity moving by sea from a loading region to a discharge region. The two ports are representative when the source reports a country-level figure.',
      ],
      [
        'Chokepoint',
        'A strait or canal that a large share of a trade has to pass, with no alternative that is both short and cheap.',
      ],
      [
        'Reference period',
        'The last full year before the war. It sizes each corridor and is never mixed with what has happened since.',
      ],
      [
        'Current situation',
        'What the war has changed on a corridor or a strait, with the latest evidence found for it and the date of the review.',
      ],
      [
        'Scope',
        'How far a figure reaches: the corridor itself, the exporting or importing country as a whole, a chokepoint, or the global market.',
      ],
      [
        'Weight',
        'The thickness of a line: an editorial rank of the order of magnitude, not a measurement.',
      ],
    ],
  },
  {
    id: 'trade',
    label: 'Trade and disruption',
    terms: [
      [
        'Benchmark',
        'A reference price against which physical cargoes are priced, such as Brent for crude oil or TTF for European gas.',
      ],
      [
        'Front-month future',
        'The futures contract for the nearest delivery month — the price usually quoted as “the” price of a commodity.',
      ],
      [
        'Spot and term',
        'A spot cargo is sold for prompt delivery at the price of the day; a term cargo is delivered under a long-running contract.',
      ],
      [
        'Arbitrage',
        'A price gap between two regions wide enough to pay for the freight between them. When it opens, cargoes change destination.',
      ],
      [
        'Force majeure',
        'A contract clause that suspends delivery obligations when an event outside a party’s control prevents performance.',
      ],
      [
        'Bypass pipeline',
        'A pipeline that carries oil overland to a port beyond a chokepoint, so that exports continue when the strait does not.',
      ],
      [
        'Cape routing',
        'Sailing around the Cape of Good Hope instead of through the Red Sea and the Suez Canal: a longer voyage, more days at sea and more ships tied up.',
      ],
      [
        'Ship-to-ship transfer',
        'Cargo moved from one vessel to another at sea or at anchor rather than at a terminal.',
      ],
      [
        'Shuttle tanker',
        'A tanker making repeated short trips between a loading point and a storage or transfer point.',
      ],
      [
        'Laden and ballast',
        'A ship is laden when it carries cargo and in ballast when it sails empty, usually on the way back to load. Sailing times here cover the laden leg only.',
      ],
    ],
  },
  {
    id: 'ships',
    label: 'Ship classes',
    terms: [
      [
        'VLCC',
        'Very large crude carrier: the largest tanker class in routine use and the standard ship for long-haul crude, notably from the Gulf to Asia.',
      ],
      [
        'Suezmax',
        'The largest tanker able to pass the Suez Canal fully laden; it carries about half a VLCC cargo.',
      ],
      [
        'Aframax',
        'A mid-size crude tanker, used on shorter hauls and at ports that cannot take larger ships.',
      ],
      [
        'LR2 and MR product tankers',
        'Long-range and medium-range tankers with coated tanks for refined products such as diesel, jet fuel and gasoline: LR2 on long hauls, MR on regional ones.',
      ],
      [
        'LNG carrier',
        'A ship that carries natural gas liquefied by cooling, in insulated tanks. An Arc7 carrier is an ice-class version built for Arctic terminals.',
      ],
      [
        'Capesize and Newcastlemax',
        'The large dry bulk carriers of the iron ore and coal trades. Too big for the original Panama locks, they sail by the capes; Newcastlemax is the largest size the port of Newcastle, Australia, accepts.',
      ],
      [
        'VLOC and Valemax',
        'Very large ore carriers, bigger than a Capesize and dedicated to iron ore, mostly from Brazil to Asia.',
      ],
      [
        'Panamax and Kamsarmax',
        'Mid-size bulk carriers for grain and coal, sized on the original Panama locks; Kamsarmax is the longest that fits the port of Kamsar in Guinea.',
      ],
      [
        'Supramax and Ultramax',
        'Smaller bulk carriers fitted with their own cranes, able to load and discharge at ports that have no shore equipment.',
      ],
    ],
  },
  {
    id: 'units',
    label: 'Units',
    terms: [
      ['bbl · b/d', 'Barrel, the volume unit of oil; barrels per day measure a flow.'],
      [
        'MMBtu',
        'Million British thermal units: the energy unit in which most gas and LNG is priced.',
      ],
      [
        'MWh',
        'Megawatt-hour: the energy unit in which European gas at the TTF hub is priced.',
      ],
      ['Mt · Mtpa', 'Million tonnes, and million tonnes per year.'],
      ['dmt', 'Dry metric tonne: iron ore is priced on its weight without moisture.'],
      [
        'bu',
        'Bushel, the volume unit in which grain futures are quoted in the United States.',
      ],
      [
        'nm · kn',
        'Nautical mile, the distance unit at sea; a knot is one nautical mile per hour.',
      ],
    ],
  },
];

export const GLOSSARY_COUNT = GLOSSARY.reduce((n, g) => n + g.terms.length, 0);
