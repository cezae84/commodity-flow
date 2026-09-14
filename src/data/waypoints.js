/**
 * Maritime chokepoints and reusable corridor segments.
 *
 * All coordinates are [latitude, longitude] in decimal degrees.
 * Paths follow real navigable axes (strait channels, customary deep-sea routes):
 * no segment may cross a landmass.
 *
 * Trans-Pacific routes deliberately use continuous longitudes beyond -180°
 * (e.g. -220 = 140°E). The renderer duplicates those paths by +360° so they stay
 * visible wherever the map is panned.
 */

/**
 * Ports and terminals (origins and destinations). A route references a port by
 * its key in data/routes.csv (from_port / to_port).
 */
export const PORTS = {
  // --- Persian Gulf ---
  rasTanura: { name: 'Ras Tanura (Saudi Arabia)', country: 'Saudi Arabia', c: [26.65, 50.16] },
  basra: { name: 'Basra Oil Terminal (Iraq)', country: 'Iraq', c: [29.68, 48.81] },
  kharg: { name: 'Kharg Island (Iran)', country: 'Iran', c: [29.23, 50.32] },
  rasLaffan: { name: 'Ras Laffan (Qatar)', country: 'Qatar', c: [25.92, 51.55] },
  mesaieed: { name: 'Mesaieed (Qatar)', country: 'Qatar', c: [24.99, 51.57] },
  ruwais: { name: 'Ruwais (United Arab Emirates)', country: 'United Arab Emirates', c: [24.13, 52.72] },
  jubail: { name: 'Jubail (Saudi Arabia)', country: 'Saudi Arabia', c: [27.02, 49.66] },
  fujairah: { name: 'Fujairah (United Arab Emirates)', country: 'United Arab Emirates', c: [25.15, 56.38] },
  jebelAli: { name: 'Jebel Ali – EGA (United Arab Emirates)', country: 'United Arab Emirates', c: [25.0, 55.06] },
  jask: { name: 'Jask (Iran, Gulf of Oman)', country: 'Iran', c: [25.65, 57.77] },
  yanbu: { name: 'Yanbu (Saudi Arabia, Red Sea)', country: 'Saudi Arabia', c: [24.09, 38.02] },

  // --- South Asia ---
  vadinar: { name: 'Vadinar / Sikka (India)', country: 'India', c: [22.31, 69.65] },
  jamnagar: { name: 'Jamnagar (India)', country: 'India', c: [22.45, 69.15] },
  mundra: { name: 'Mundra (India)', country: 'India', c: [22.75, 69.7] },
  paradip: { name: 'Paradip (India)', country: 'India', c: [20.26, 86.68] },

  // --- East Asia ---
  ningbo: { name: 'Ningbo-Zhoushan (China)', country: 'China', c: [29.93, 122.28] },
  qingdao: { name: 'Qingdao (China)', country: 'China', c: [36.04, 120.6] },
  caofeidian: { name: 'Caofeidian (China)', country: 'China', c: [38.9, 118.5] },
  majishan: { name: 'Majishan / Zhoushan (China)', country: 'China', c: [30.35, 122.2] },
  lianyungang: { name: 'Lianyungang (China)', country: 'China', c: [34.75, 119.45] },
  rizhao: { name: 'Rizhao (China)', country: 'China', c: [35.38, 119.55] },
  niigata: { name: 'Niigata (Japan)', country: 'Japan', c: [37.95, 139.05] },
  chiba: { name: 'Chiba – Tokyo Bay (Japan)', country: 'Japan', c: [35.45, 140.05] },
  ulsan: { name: 'Ulsan (South Korea)', country: 'South Korea', c: [35.45, 129.42] },
  kozmino: { name: 'Kozmino (Russia, Pacific)', country: 'Russia', c: [42.65, 133.1] },
  vostochny: { name: 'Vostochny (Russia, Pacific)', country: 'Russia', c: [42.75, 133.0] },

  // --- Southeast Asia / Oceania ---
  singapore: { name: 'Singapore', country: 'Singapore', c: [1.26, 103.85] },
  taboneo: { name: 'Taboneo / South Kalimantan (Indonesia)', country: 'Indonesia', c: [-3.6, 114.5] },
  morowali: { name: 'Morowali – IMIP, Sulawesi (Indonesia)', country: 'Indonesia', c: [-2.87, 122.1] },
  pangkalbalam: { name: 'Pangkalbalam – Bangka (Indonesia)', country: 'Indonesia', c: [-2.11, 106.13] },
  claver: { name: 'Claver – Surigao del Norte (Philippines)', country: 'Philippines', c: [9.6, 125.75] },
  portHedland: { name: 'Port Hedland (Australia)', country: 'Australia', c: [-20.31, 118.57] },
  dampier: { name: 'Dampier (Australia)', country: 'Australia', c: [-20.66, 116.71] },
  karratha: { name: 'Karratha – North West Shelf (Australia)', country: 'Australia', c: [-20.6, 116.83] },
  gladstone: { name: 'Gladstone (Australia)', country: 'Australia', c: [-23.84, 151.28] },
  newcastleAu: { name: 'Newcastle (Australia)', country: 'Australia', c: [-32.93, 151.79] },
  hayPoint: { name: 'Hay Point / Dalrymple Bay (Australia)', country: 'Australia', c: [-21.28, 149.31] },
  weipa: { name: 'Weipa – Cape York (Australia)', country: 'Australia', c: [-12.67, 141.87] },
  townsville: { name: 'Townsville (Australia)', country: 'Australia', c: [-19.25, 146.83] },
  kwinana: { name: 'Kwinana – Fremantle (Australia)', country: 'Australia', c: [-32.2, 115.6] },
  fremantle: { name: 'Fremantle (Australia)', country: 'Australia', c: [-32.05, 115.74] },
  bunbury: { name: 'Bunbury (Australia)', country: 'Australia', c: [-33.32, 115.63] },
  esperance: { name: 'Esperance (Australia)', country: 'Australia', c: [-33.87, 121.9] },
  grooteEylandt: { name: 'Groote Eylandt – GEMCO (Australia)', country: 'Australia', c: [-13.95, 136.42] },
  kuantan: { name: 'Kuantan (Malaysia)', country: 'Malaysia', c: [3.98, 103.43] },

  // --- Europe ---
  rotterdam: { name: 'Rotterdam (Netherlands)', country: 'Netherlands', c: [51.95, 4.05] },
  zeebrugge: { name: 'Zeebrugge (Belgium)', country: 'Belgium', c: [51.35, 3.19] },
  primorsk: { name: 'Primorsk (Russia, Baltic)', country: 'Russia', c: [60.34, 28.62] },
  ustLuga: { name: 'Oust-Louga (Russia, Baltic)', country: 'Russia', c: [59.65, 28.4] },
  novorossiysk: { name: 'Novorossiisk (Russia, Black Sea)', country: 'Russia', c: [44.7, 37.79] },
  pivdennyi: { name: 'Pivdennyï / Odessa (Ukraine)', country: 'Ukraine', c: [46.62, 31.01] },
  constanta: { name: 'Constanța (Romania)', country: 'Romania', c: [44.15, 28.72] },
  mersin: { name: 'Mersin (Turkey)', country: 'Turkey', c: [36.79, 34.62] },
  sabetta: { name: 'Sabetta – Yamal LNG (Russia, Arctic)', country: 'Russia', c: [71.27, 72.1] },

  // --- Africa ---
  alexandria: { name: 'Alexandrie (Egypt)', country: 'Egypt', c: [31.2, 29.85] },
  richardsBay: { name: 'Richards Bay (South Africa)', country: 'South Africa', c: [-28.8, 32.08] },
  kamsar: { name: 'Kamsar (Guinea)', country: 'Guinea', c: [10.65, -14.5] },
  morebaya: { name: 'Morebaya – Simandou (Guinea)', country: 'Guinea', c: [9.42, -13.32] },
  jorfLasfar: { name: 'Jorf Lasfar (Morocco)', country: 'Morocco', c: [33.11, -8.63] },
  bonny: { name: 'Bonny (Nigeria)', country: 'Nigeria', c: [4.42, 7.16] },
  soyo: { name: 'Soyo / Cabinda (Angola)', country: 'Angola', c: [-6.13, 12.2] },
  mombasa: { name: 'Mombasa (Kenya)', country: 'Kenya', c: [-4.06, 39.68] },
  durban: { name: 'Durban (South Africa)', country: 'South Africa', c: [-29.87, 31.05] },
  ngqura: { name: 'Ngqura – Port Elizabeth (South Africa)', country: 'South Africa', c: [-33.8, 25.68] },
  owendo: { name: 'Owendo – Libreville (Gabon)', country: 'Gabon', c: [0.3, 9.5] },

  // --- Americas ---
  houston: { name: 'Houston / Galveston (United States)', country: 'United States', c: [29.35, -94.8] },
  corpusChristi: { name: 'Corpus Christi (United States)', country: 'United States', c: [27.62, -97.2] },
  sabinePass: { name: 'Sabine Pass LNG (United States)', country: 'United States', c: [29.73, -93.87] },
  swPass: { name: 'New Orleans / Southwest Pass (United States)', country: 'United States', c: [28.93, -89.42] },
  columbiaRiver: { name: 'Columbia River – Pacific NW (United States)', country: 'United States', c: [46.22, -124.18] },
  vancouver: { name: 'Vancouver – Roberts Bank (Canada)', country: 'Canada', c: [49.02, -123.16] },
  stabroek: { name: 'Stabroek Block (Guyana)', country: 'Guyana', c: [7.6, -56.8] },
  puertoBolivar: { name: 'Puerto Bolívar – Cerrejón (Colombia)', country: 'Colombia', c: [12.24, -71.97] },
  santos: { name: 'Santos (Brazil)', country: 'Brazil', c: [-24.0, -46.32] },
  paranagua: { name: 'Paranaguá (Brazil)', country: 'Brazil', c: [-25.52, -48.5] },
  tubarao: { name: 'Tubarão / Vitória (Brazil)', country: 'Brazil', c: [-20.29, -40.25] },
  pontaMadeira: { name: 'Ponta da Madeira – São Luís (Brazil)', country: 'Brazil', c: [-2.57, -44.37] },
  tupi: { name: 'Santos Basin – Tupi field (Brazil)', country: 'Brazil', c: [-24.2, -42.5] },
  rosario: { name: 'Rosario / San Lorenzo (Argentina)', country: 'Argentina', c: [-32.95, -60.63] },
  mejillones: { name: 'Mejillones / Antofagasta (Chile)', country: 'Chile', c: [-23.1, -70.45] },
  callao: { name: 'Callao (Peru)', country: 'Peru', c: [-12.05, -77.16] },
};

/**
 * Map position of each chokepoint marker. Names, status, figures and sources
 * live in data/chokepoints.csv and data/facts.csv.
 */
export const CHOKEPOINT_POSITIONS = {
  hormuz: [26.57, 56.25],
  malacca: [2.5, 100.9],
  suez: [30, 32.55],
  babElMandeb: [12.6, 43.35],
  goodHope: [-35.4, 20],
  panama: [9.1, -79.7],
  turkishStraits: [40.6, 27.6],
  danishStraits: [56, 11.2],
  lombok: [-8.65, 115.8],
  sunda: [-6, 105.75],
};

// ---------------------------------------------------------------------------
// Reusable corridor segments
// ---------------------------------------------------------------------------

/** Persian Gulf → Hormuz → Gulf of Oman → Arabian Sea. */
export const GULF_OUT = [
  [26.5, 52.0],
  [26.3, 54.2],
  [26.55, 56.15],
  [26.45, 56.7], // east of Cape Musandam, in the outbound lane
  [25.6, 57.1],
  [24.9, 58.3],
  [22.8, 60.8],
];

/** Approach to the Gulf of Kutch (Vadinar, Mundra) from the Arabian Sea. */
export const TO_KUTCH = [
  [21.0, 65.5],
  [21.6, 67.6],
  [22.35, 68.6],
  [22.5, 69.2],
];

/** Arabian Sea → south of Sri Lanka → Bay of Bengal → northern entrance of Malacca. */
export const ARABIAN_TO_MALACCA = [
  [20.5, 63.0],
  [15.0, 68.5],
  [9.0, 74.5],
  [5.4, 80.6],
  [5.5, 86.0],
  [5.8, 92.0],
  [5.9, 95.3],
];

/** Malacca Strait channel through to the eastern exit of the Singapore Strait. */
export const MALACCA = [
  [5.5, 96.8],
  [4.9, 98.4],
  [4.0, 99.6],
  [3.0, 100.6],
  [2.2, 101.9],
  [1.6, 102.9],
  [1.35, 103.25],
  [1.19, 103.75],
  [1.16, 104.1],
  [1.15, 104.55],
];

/** Out of Singapore → South China Sea → Ningbo-Zhoushan. */
export const SCS_TO_NINGBO = [
  [2.5, 105.6],
  [5.5, 107.5],
  [10.0, 109.5],
  [14.0, 111.0],
  [18.5, 113.5],
  [21.8, 116.5],
  [24.3, 119.2],
  [27.0, 121.5],
  [29.93, 122.28],
];

/** Out of Singapore → South China Sea → Qingdao (Shandong). */
export const SCS_TO_QINGDAO = [
  [2.5, 105.6],
  [5.5, 107.5],
  [10.0, 109.5],
  [14.0, 111.0],
  [18.5, 113.5],
  [21.8, 116.5],
  [24.3, 119.2],
  [27.5, 122.0],
  [31.0, 123.5],
  [34.2, 122.5],
  [36.04, 120.6],
];

/** Out of Singapore → Luzon Strait → Tokyo Bay. */
export const SCS_TO_JAPAN = [
  [3.0, 106.0],
  [8.0, 109.0],
  [13.0, 112.5],
  [18.0, 116.5],
  [20.8, 120.8],
  [22.5, 123.5],
  [26.0, 127.8],
  [29.5, 132.0],
  [32.5, 136.5],
  [34.9, 139.75],
  [35.45, 140.05],
];

/** Out of Singapore → East China Sea → Ulsan (South Korea). */
export const SCS_TO_KOREA = [
  [3.0, 106.0],
  [8.0, 109.0],
  [13.0, 112.5],
  [18.0, 116.5],
  [21.0, 121.0],
  [25.0, 122.5],
  [29.0, 125.5],
  [32.0, 127.2],
  [34.0, 128.8],
  [35.45, 129.42],
];

/** Arabian Sea → east of Madagascar → Cape of Good Hope. */
export const ARABIAN_TO_CAPE = [
  [20.0, 62.0],
  [12.0, 58.0],
  [4.0, 54.5],
  [-6.0, 52.5],
  [-16.0, 53.0],
  [-24.0, 49.0],
  [-30.0, 41.0],
  [-34.0, 32.0],
  [-35.5, 25.0],
  [-35.4, 20.0],
];

/** Cape of Good Hope → up the eastern Atlantic → Rotterdam. */
export const CAPE_TO_NW_EUROPE = [
  [-34.8, 17.3],
  [-30.0, 14.5],
  [-20.0, 11.0],
  [-10.0, 8.0],
  [-2.0, 5.5],
  [2.5, 0.5],
  [3.6, -4.0],
  [3.6, -7.8], // off Cape Palmas (Liberia)
  [4.2, -11.5],
  [6.5, -15.0],
  [9.5, -17.5],
  [14.0, -19.0],
  [20.5, -19.5],
  [28.0, -16.5],
  [34.0, -11.5],
  [38.5, -10.5],
  [43.0, -10.0],
  [47.0, -7.5],
  [48.6, -5.5],
  [49.8, -2.0],
  [50.6, 1.2],
  [51.4, 2.6],
  [51.95, 4.05],
];

/** Cape of Good Hope → Indian Ocean → northern entrance of Malacca. */
export const CAPE_TO_MALACCA = [
  [-35.0, 24.0],
  [-32.5, 33.0],
  [-30.0, 42.0],
  [-27.5, 50.0], // south of Madagascar
  [-22.0, 57.8], // south of Mauritius and Réunion
  [-14.0, 61.0],
  [-6.0, 70.0],
  [1.0, 80.0],
  [4.0, 88.0],
  [5.9, 95.3],
];

/** Port Said → Suez Canal → Red Sea → Bab el-Mandeb → Gulf of Aden. */
export const SUEZ_TO_ADEN = [
  [31.26, 32.32],
  [30.0, 32.55],
  [28.2, 33.3],
  [26.0, 35.2],
  [22.0, 37.6],
  [18.0, 39.8],
  [15.0, 41.7],
  [13.6, 42.7],
  [12.6, 43.35],
  [12.5, 45.5],
  [12.3, 48.5],
  [12.6, 52.0],
  [15.0, 57.0],
];

/** Port Said → Mediterranean → Gibraltar → Atlantic. */
export const MED_WESTBOUND = [
  [31.26, 32.32],
  [33.5, 29.0],
  [34.6, 24.0],
  [36.0, 17.5],
  [36.2, 14.0], // between Sicily and Malta
  [37.3, 11.7], // Strait of Sicily, south-east of Pantelleria
  [37.6, 5.0],
  [36.6, -1.5],
  [35.95, -5.6],
  [36.0, -8.2],
  [36.5, -9.8], // off Cape St Vincent
  [38.0, -10.3],
];

/** Iberian Atlantic → English Channel → Rotterdam. */
export const IBERIA_TO_ROTTERDAM = [
  [40.0, -10.8],
  [43.5, -10.0],
  [47.0, -7.5],
  [48.6, -5.5],
  [49.8, -2.0],
  [50.6, 1.2],
  [51.4, 2.6],
  [51.95, 4.05],
];

/** Eastern Baltic → Danish Straits → Skagerrak → North Sea → Rotterdam. */
export const BALTIC_TO_NORTH_SEA = [
  [59.9, 27.0],
  [59.5, 23.5],
  [58.5, 20.3],
  [56.0, 18.0],
  [54.9, 15.6], // south of Bornholm
  [54.9, 12.6],
  [55.3, 11.0],
  [56.5, 11.3],
  [57.75, 10.6],
  [57.7, 8.0],
  [56.0, 4.5],
  [54.3, 3.0],
  [52.8, 3.2],
  [51.95, 4.05],
];

/** Black Sea → Bosporus → Marmara → Dardanelles → Aegean → eastern Mediterranean. */
export const BLACK_SEA_OUT = [
  [43.5, 33.0],
  [42.3, 30.2],
  [41.4, 29.2],
  [41.1, 29.05],
  [40.95, 28.9],
  [40.65, 27.6],
  [40.2, 26.35],
  [39.9, 25.75],
  [38.6, 25.3],
  [37.4, 26.0],
  [36.4, 26.6],
  [35.3, 27.6],
];

/** English Channel → Atlantic → Gibraltar → eastern Mediterranean (eastbound). */
export const CHANNEL_TO_GIBRALTAR = [
  [51.4, 2.6],
  [50.6, 1.2],
  [49.8, -2.0],
  [48.6, -5.5],
  [46.0, -8.5],
  [43.0, -10.5],
  [38.5, -10.3],
  [36.5, -9.8], // off Cape St Vincent
  [36.0, -7.8],
  [35.95, -5.6],
];

/** Gulf of Mexico → Florida Strait → North Atlantic → English Channel → Rotterdam. */
export const USGULF_TO_NW_EUROPE = [
  [28.5, -92.2],
  [26.5, -88.5],
  [24.6, -84.0],
  [24.1, -81.6], // south of the Keys
  [24.8, -79.6], // Florida Strait
  [27.5, -79.2],
  [31.5, -78.0],
  [35.5, -73.0],
  [39.0, -65.0],
  [43.0, -52.0],
  [47.0, -38.0],
  [49.5, -22.0],
  [49.5, -10.0],
  [49.2, -5.5],
  [50.3, -1.5],
  [51.2, 2.0],
];

/** Gulf of Mexico → Yucatán Channel → Caribbean Sea → Panama Canal. */
export const USGULF_TO_PANAMA = [
  [27.5, -88.0],
  [24.5, -85.5],
  [21.5, -85.3],
  [18.0, -83.0],
  [13.5, -81.5],
  [10.5, -80.0],
  [9.37, -79.92],
  [9.1, -79.75],
  [8.9, -79.53],
  [8.0, -79.5],
  [7.0, -80.3],
  [6.5, -82.0],
];

/**
 * Panama → North Pacific → East Asia.
 * Continuous longitudes beyond -180° (-220 = 140°E).
 */
export const PACIFIC_PANAMA_TO_EASTASIA = [
  [8.0, -95.0],
  [12.0, -115.0],
  [17.0, -135.0],
  [21.0, -150.0], // east of the Hawaiian archipelago
  [25.0, -163.0], // north of the North-Western Hawaiian Islands
  [29.5, -180.0],
  [31.0, -198.0],
  [30.5, -212.0],
];

/** Cape of Good Hope → South Atlantic → Brazilian coast. */
export const CAPE_TO_BRAZIL = [
  [-35.4, 20.0],
  [-36.0, 12.0],
  [-36.5, 0.0],
  [-35.0, -12.0],
  [-31.0, -25.0],
  [-27.0, -33.0],
  [-24.5, -40.0],
];

/** Kalimantan → Makassar Strait → Celebes Sea → South China Sea. */
export const KALIMANTAN_TO_SCS = [
  [-4.0, 114.4], // off Cape Selatan
  [-4.7, 115.0],
  [-4.6, 116.0], // south of Pulau Laut
  [-3.8, 117.0],
  [-3.0, 117.6],
  [-2.0, 118.0],
  [0.0, 118.8],
  [2.5, 119.3],
  [4.8, 119.5], // Sibutu Passage
  [6.5, 118.5],
  [7.6, 117.0], // Balabac Strait
  [9.0, 116.4],
  [11.5, 116.0],
  [14.5, 115.5],
  [18.0, 114.5],
  [21.5, 114.5],
];

/** Sunda Strait channel, between Java and Sumatra. */
export const SUNDA = [
  [-5.5, 106.1],
  [-5.95, 105.85],
  [-6.2, 105.4],
  [-6.6, 104.9],
  [-7.5, 104.3],
];

/** Northern exit of the Sunda Strait → Gaspar Strait → South China Sea. */
export const SUNDA_TO_SCS = [
  [-5.2, 106.4],
  [-4.2, 106.9],
  [-2.9, 107.15], // Gaspar Strait, between Bangka and Belitung
  [-1.2, 107.3],
  [1.5, 107.2],
  [4.5, 107.2], // west of the Natuna Islands
  [7.5, 108.5],
];

/** North-west Australian coast → Lombok Strait → Makassar Strait → Celebes Sea. */
export const NWAUSTRALIA_TO_MAKASSAR = [
  [-18.0, 117.0],
  [-14.0, 116.0],
  [-10.5, 115.8],
  [-8.65, 115.8],
  [-6.5, 116.3],
  [-3.0, 117.5],
  [0.0, 118.8],
  [3.0, 121.5],
];

/** Reverse direction of the corridors above. */
export const ADEN_TO_SUEZ = [...SUEZ_TO_ADEN].reverse();
export const MED_EASTBOUND = [...MED_WESTBOUND].reverse();

/**
 * Overland paths of the pipelines bypassing the Strait of Hormuz, drawn dashed.
 * Names, capacities and sources live in data/pipelines.csv and data/facts.csv.
 */
export const PIPELINE_PATHS = {
  petroline: [
    [25.93, 49.68],
    [25.0, 46.5],
    [24.6, 43.0],
    [24.3, 40.0],
    [24.09, 38.02],
  ],
  adcop: [
    [23.75, 53.75],
    [24.3, 55.0],
    [24.9, 56.0],
    [25.15, 56.38],
  ],
  gorehJask: [
    [29.35, 50.8],
    [28.0, 53.0],
    [27.0, 55.5],
    [25.65, 57.77],
  ],
};

/** Celebes Sea → east of the Philippines → Luzon Strait → East China Sea. */
export const CELEBES_TO_EASTCHINA = [
  [4.5, 125.5],
  [6.0, 127.2], // east of Mindanao
  [9.5, 128.2],
  [14.0, 126.8],
  [18.5, 124.2],
  [21.5, 122.3],
  [25.0, 122.6],
  [29.0, 123.0],
];

/** South-west Australia → Cape Leeuwin → north towards Indonesia. */
export const SWAUSTRALIA_TO_LOMBOK = [
  [-34.5, 120.0],
  [-35.4, 117.0],
  [-34.6, 114.6], // off Cape Leeuwin
  [-31.0, 113.5],
  [-25.0, 111.5],
  [-18.0, 111.5],
  [-13.0, 113.5],
  [-10.5, 115.8],
];

/** South African east coast → Indian Ocean → south of Madagascar. */
export const SAFRICA_EASTBOUND = [
  [-30.5, 32.5],
  [-29.5, 37.0],
  [-28.5, 44.0],
];

/** Gulf of Guinea → South Atlantic → Cape of Good Hope. */
export const GUINEA_GULF_TO_CAPE = [
  [-0.5, 8.5],
  [-4.0, 9.5],
  [-10.0, 10.5],
  [-18.0, 10.0],
  [-26.0, 12.0],
  [-32.0, 15.5],
  [-35.6, 18.5],
];

/** Vancouver → Strait of Georgia → Juan de Fuca Strait → open Pacific. */
export const VANCOUVER_OUT = [
  [48.9, -123.3],
  [48.55, -123.15],
  [48.3, -123.4], // Juan de Fuca Strait
  [48.35, -124.6],
  [48.45, -125.6],
];

/** Pacific exit of the Panama Canal → Caribbean Sea → Atlantic. */
export const PANAMA_TO_ATLANTIC = [
  [6.5, -82.0],
  [7.0, -80.3],
  [8.0, -79.5],
  [8.9, -79.53],
  [9.1, -79.75],
  [9.37, -79.92],
  [10.5, -79.5],
  [12.0, -76.0],
  [13.5, -71.0],
  [14.0, -66.0],
  [13.6, -62.5],
  [13.5, -61.05], // St Vincent Passage
  [12.8, -59.0],
  [10.5, -55.5],
  [8.0, -53.5],
];

/** Western equatorial Atlantic → along the Brazilian coast → Paranaguá. */
export const ATLANTIC_TO_SOUTH_BRAZIL = [
  [4.0, -49.0],
  [-1.0, -44.0],
  [-4.5, -34.5],
  [-10.0, -34.0],
  [-15.0, -37.5],
  [-21.0, -39.5],
  [-23.5, -41.5],
  [-25.5, -45.5],
];

/** North Pacific: Vancouver → East Asia (continuous longitudes < -180°). */
export const NORTH_PACIFIC_TO_EASTASIA = [
  [50.0, -135.0],
  [51.0, -150.0],
  [51.0, -165.0],
  [49.0, -178.0],
  [46.0, -190.0],
  [42.0, -203.0],
  [37.0, -213.0],
  [33.0, -222.0],
  [29.0, -230.0], // south of Yakushima and the Osumi Islands
  [29.5, -235.0],
];

/** Torres Strait → southern Papuan coast → Coral Sea. */
export const TORRES_TO_CORAL = [
  [-11.3, 141.8],
  [-10.7, 141.9],
  [-10.45, 142.3], // Prince of Wales Channel
  [-10.0, 143.6], // Great North East Channel
  [-9.5, 145.0],
  [-10.2, 147.5],
  [-10.8, 150.5],
  [-11.8, 152.8],
  [-13.0, 155.2],
];

/** Great Barrier Reef (Queensland coast) → open Coral Sea. */
export const QUEENSLAND_TO_CORAL = [
  [-18.8, 147.5],
  [-17.5, 149.0],
  [-15.0, 151.0],
  [-13.5, 153.5],
  [-13.0, 155.2],
];

/** Banda Sea → Molucca Sea → Celebes Sea. */
export const MOLUCCA_NORTHBOUND = [
  [-2.3, 122.8],
  [-1.0, 124.0],
  [0.5, 125.3],
  [2.2, 126.0], // east of the Minahasa Peninsula
  [4.2, 125.9], // east of the Sangihe Islands
  [4.5, 125.5],
];

/** East China Sea → Yellow Sea → Shandong and Jiangsu ports. */
export const EASTCHINA_TO_YELLOWSEA = [
  [32.0, 122.5],
  [34.5, 121.5],
];

/** East of Papua New Guinea: routes around New Britain. */
export const CORAL_SEA_TO_PHILIPPINE_SEA = [
  [-13.0, 155.2], // south-east of the Louisiade Archipelago
  [-6.5, 153.5],
  [-3.5, 153.8], // east of New Ireland
  [-0.8, 150.0],
  [0.5, 145.0],
  [3.0, 139.0],
];
