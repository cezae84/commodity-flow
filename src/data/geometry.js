import {
  PORTS,
  GULF_OUT,
  ARABIAN_TO_MALACCA,
  MALACCA,
  SCS_TO_NINGBO,
  SCS_TO_QINGDAO,
  SCS_TO_JAPAN,
  SCS_TO_KOREA,
  ARABIAN_TO_CAPE,
  CAPE_TO_NW_EUROPE,
  CAPE_TO_MALACCA,
  CAPE_TO_BRAZIL,
  ADEN_TO_SUEZ,
  SUEZ_TO_ADEN,
  MED_WESTBOUND,
  MED_EASTBOUND,
  IBERIA_TO_ROTTERDAM,
  BALTIC_TO_NORTH_SEA,
  BLACK_SEA_OUT,
  CHANNEL_TO_GIBRALTAR,
  USGULF_TO_NW_EUROPE,
  USGULF_TO_PANAMA,
  PACIFIC_PANAMA_TO_EASTASIA,
  KALIMANTAN_TO_SCS,
  NWAUSTRALIA_TO_MAKASSAR,
  CELEBES_TO_EASTCHINA,
  CORAL_SEA_TO_PHILIPPINE_SEA,
  SUNDA,
  SUNDA_TO_SCS,
  TO_KUTCH,
  TORRES_TO_CORAL,
  QUEENSLAND_TO_CORAL,
  MOLUCCA_NORTHBOUND,
  EASTCHINA_TO_YELLOWSEA,
  VANCOUVER_OUT,
  PANAMA_TO_ATLANTIC,
  ATLANTIC_TO_SOUTH_BRAZIL,
  NORTH_PACIFIC_TO_EASTASIA,
  SWAUSTRALIA_TO_LOMBOK,
  SAFRICA_EASTBOUND,
  GUINEA_GULF_TO_CAPE,
} from './waypoints.js';

/** Concatenates loose points and segments into a single path. */
const p = (...parts) =>
  parts.flatMap((part) => (Array.isArray(part[0]) ? part : [part]));

/**
 * Route geometry, keyed by route id. Editorial data (names, ports, status,
 * figures, sources) lives in the CSV files under data/; only the drawn line is
 * defined here. The first and last points must sit on the route's from/to ports
 * (npm run check:data verifies it).
 */
export const ROUTE_PATHS = {
  'crude-gulf-china': p(PORTS.rasTanura.c, GULF_OUT, ARABIAN_TO_MALACCA, MALACCA, SCS_TO_NINGBO),
  'crude-gulf-india': p(
    PORTS.basra.c,
    [
      [29.2, 49.6],
      [28.7, 50.6],
      [27.4, 51.5],
      [26.6, 52.9],
      [26.1, 54.4],
      [26.0, 55.3],
    ],
    GULF_OUT.slice(2),
    TO_KUTCH,
    PORTS.vadinar.c
  ),
  'crude-gulf-japan': p(PORTS.rasTanura.c, GULF_OUT, ARABIAN_TO_MALACCA, MALACCA, SCS_TO_JAPAN),
  'crude-gulf-korea': p(
    PORTS.rasTanura.c,
    GULF_OUT,
    ARABIAN_TO_MALACCA,
    MALACCA,
    SCS_TO_KOREA
  ),
  'crude-gulf-europe-suez': p(
    PORTS.rasTanura.c,
    GULF_OUT,
    [[20.0, 62.0]],
    ADEN_TO_SUEZ,
    MED_WESTBOUND.slice(1),
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'crude-gulf-europe-cape': p(
    PORTS.rasTanura.c,
    GULF_OUT,
    ARABIAN_TO_CAPE,
    CAPE_TO_NW_EUROPE
  ),
  'crude-yanbu-europe': p(
    PORTS.yanbu.c,
    [
      [24.2, 37.5],
      [25.2, 36.2],
      [26.5, 35.2],
      [27.5, 34.2],
    ],
    [
      [28.2, 33.3],
      [30.0, 32.55],
      [31.26, 32.32],
    ],
    MED_WESTBOUND.slice(1),
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'crude-fujairah-india': p(
    PORTS.fujairah.c,
    [
      [25.2, 57.6],
      [23.5, 59.5],
      [21.5, 62.5],
    ],
    TO_KUTCH,
    PORTS.vadinar.c
  ),
  'crude-russia-baltic-india': p(
    PORTS.primorsk.c,
    BALTIC_TO_NORTH_SEA.slice(0, -1),
    [[52.0, 2.9]],
    CHANNEL_TO_GIBRALTAR,
    MED_EASTBOUND.slice(3),
    SUEZ_TO_ADEN.slice(1),
    [[17.0, 60.0]],
    TO_KUTCH,
    PORTS.vadinar.c
  ),
  'crude-russia-pacific-china': p(
    PORTS.kozmino.c,
    [
      [42.0, 132.5],
      [40.0, 131.5],
      [37.5, 131.0],
      [35.5, 130.5],
      [34.4, 130.0],
      [33.2, 128.4],
      [32.5, 125.5],
      [34.5, 122.5],
    ],
    PORTS.qingdao.c
  ),
  'crude-blacksea-india': p(
    PORTS.novorossiysk.c,
    [[44.0, 36.0]],
    BLACK_SEA_OUT,
    [
      [34.8, 28.0],
      [33.2, 30.5],
    ],
    SUEZ_TO_ADEN,
    [[17.0, 60.0]],
    TO_KUTCH,
    PORTS.vadinar.c
  ),
  'crude-usgulf-europe': p(
    PORTS.corpusChristi.c,
    [[27.0, -96.0]],
    USGULF_TO_NW_EUROPE,
    PORTS.rotterdam.c
  ),
  'crude-wafrica-china': p(
    PORTS.soyo.c,
    [
      [-6.6, 11.3],
      [-10.0, 11.0],
      [-16.0, 10.0],
      [-25.0, 12.0],
      [-32.0, 15.5],
      [-35.6, 18.5],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_NINGBO
  ),
  'crude-brazil-china': p(
    PORTS.tupi.c,
    [
      [-25.5, -41.0],
      [-30.0, -36.0],
      [-33.5, -25.0],
      [-35.5, -12.0],
      [-36.0, 0.0],
      [-36.0, 12.0],
      [-35.4, 20.0],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'products-gulf-europe': p(
    PORTS.jubail.c,
    [[26.6, 51.0]],
    GULF_OUT.slice(1),
    [[20.0, 62.0]],
    ADEN_TO_SUEZ,
    MED_WESTBOUND.slice(1),
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'products-india-europe': p(
    PORTS.jamnagar.c,
    [
      [21.0, 68.0],
      [18.0, 66.0],
      [14.0, 63.0],
    ],
    ARABIAN_TO_CAPE.slice(1),
    CAPE_TO_NW_EUROPE
  ),
  'products-usgulf-brazil': p(
    PORTS.houston.c,
    [
      [28.0, -93.0],
      [25.5, -88.0],
      [22.5, -85.8],
      [21.3, -84.5], // south of Cape San Antonio
      [20.0, -82.5],
      [17.0, -77.0],
      [15.0, -70.0],
      [13.6, -62.5],
      [13.5, -61.05], // St Vincent Passage
      [12.8, -59.0],
      [10.5, -55.5],
      [8.0, -53.5],
      [4.0, -49.0],
      [-1.0, -44.0],
      [-4.5, -34.5],
      [-10.0, -34.0],
      [-15.0, -37.5],
      [-21.0, -39.5],
      [-23.5, -41.5],
      [-24.8, -44.5],
    ],
    PORTS.santos.c
  ),
  'products-usgulf-europe': p(
    PORTS.houston.c,
    [[28.5, -93.5]],
    USGULF_TO_NW_EUROPE,
    PORTS.rotterdam.c
  ),
  'products-russia-turkey': p(
    PORTS.primorsk.c,
    BALTIC_TO_NORTH_SEA.slice(0, -1),
    [[52.0, 2.9]],
    CHANNEL_TO_GIBRALTAR,
    MED_EASTBOUND.slice(3, 7),
    [
      [35.8, 19.0],
      [34.9, 22.0],
      [34.5, 24.5], // south of Crete
      [34.5, 28.0],
      [35.3, 31.5],
      [36.0, 33.3], // Cilician Channel, north of Cyprus
      [36.1, 34.4],
      [36.5, 34.65],
    ],
    PORTS.mersin.c
  ),
  'products-gulf-eafrica': p(
    PORTS.ruwais.c,
    [
      [24.8, 53.6],
      [25.8, 55.0],
    ],
    GULF_OUT.slice(2),
    [
      [20.0, 61.0],
      [14.0, 58.0],
      [8.0, 54.0],
      [2.0, 48.0],
      [-2.0, 43.0],
    ],
    PORTS.mombasa.c
  ),
  'products-usgulf-southamerica': p(
    PORTS.houston.c,
    [[28.0, -93.0]],
    USGULF_TO_PANAMA,
    [
      [4.0, -83.0],
      [-2.0, -82.5],
      [-5.5, -82.6], // off Punta Pariñas
      [-10.0, -80.5],
      [-18.0, -73.5],
    ],
    PORTS.mejillones.c
  ),
  'lng-qatar-china': p(
    PORTS.rasLaffan.c,
    [[26.0, 52.5]],
    GULF_OUT.slice(1),
    ARABIAN_TO_MALACCA,
    MALACCA,
    SCS_TO_NINGBO
  ),
  'lng-qatar-europe': p(
    PORTS.rasLaffan.c,
    [[26.0, 52.5]],
    GULF_OUT.slice(1),
    ARABIAN_TO_CAPE,
    CAPE_TO_NW_EUROPE.slice(0, -1),
    [[51.5, 3.0]],
    PORTS.zeebrugge.c
  ),
  'lng-us-europe': p(
    PORTS.sabinePass.c,
    USGULF_TO_NW_EUROPE,
    PORTS.zeebrugge.c
  ),
  'lng-us-japan': p(
    PORTS.sabinePass.c,
    [[28.5, -92.0]],
    USGULF_TO_PANAMA,
    PACIFIC_PANAMA_TO_EASTASIA,
    [
      [32.0, -217.0],
      [33.5, -221.6],
      [34.6, -220.1],
      [35.15, -220.22],
      [35.45, -219.95],
    ]
  ),
  'lng-australia-japan': p(
    PORTS.karratha.c,
    NWAUSTRALIA_TO_MAKASSAR,
    [
      [4.5, 125.5],
      [6.0, 127.2],
      [10.0, 128.8],
      [16.0, 129.5],
      [22.0, 130.5],
      [27.0, 133.0],
      [30.5, 135.5],
      [33.0, 137.6],
      [34.6, 139.9],
      [35.15, 139.78],
    ],
    PORTS.chiba.c
  ),
  'lng-australia-china': p(
    PORTS.gladstone.c,
    [
      [-22.5, 153.5],
      [-16.0, 152.8],
    ],
    CORAL_SEA_TO_PHILIPPINE_SEA,
    [
      [7.0, 133.0],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [28.0, 122.9],
    ],
    PORTS.ningbo.c
  ),
  'lng-yamal-europe': p(
    PORTS.sabetta.c,
    [
      [72.5, 73.8],
      [73.6, 73.5],
      [74.2, 69.0], // north of Beliy Island
      [74.0, 62.0],
      [72.0, 60.5],
      [70.6, 59.5],
      [70.45, 58.0], // Kara Gate
      [70.1, 56.5],
      [70.0, 53.0],
      [70.2, 45.0],
      [71.0, 36.0],
      [71.4, 28.0],
      [71.3, 22.0], // off Finnmark
      [70.0, 16.0],
      [68.5, 12.0], // west of the Lofoten Islands
      [66.0, 8.0],
      [63.0, 4.0],
      [60.5, 3.5],
      [57.0, 2.5],
      [54.0, 3.2],
      [52.3, 3.3],
    ],
    PORTS.zeebrugge.c
  ),
  'lng-yamal-china-nsr': p(
    PORTS.sabetta.c,
    [
      [72.5, 73.8],
      [73.6, 73.5],
      [74.4, 70.0],
      [75.0, 82.0],
      [76.0, 90.0],
      [77.5, 96.0],
      [77.9, 103.5], // Vilkitsky Strait
      [77.5, 112.0],
      [76.8, 122.0],
      [76.5, 137.0], // north of the New Siberian Islands
      [76.0, 152.0],
      [74.0, 165.0],
      [71.0, 173.0],
      [69.8, 179.0],
      [69.0, 185.0], // off Chukotka
      [67.5, 189.5],
      [66.2, 191.0], // Bering Strait
      [64.5, 189.0], // north of St Lawrence Island
      [62.0, 186.0],
      [59.0, 184.0], // west of St Matthew Island
      [57.0, 183.0],
      [52.5, 182.0],
      [47.0, 177.0],
      [43.0, 171.0],
      [39.0, 161.0],
      [36.0, 150.0],
      [33.5, 140.0],
      [32.0, 133.0],
      [30.5, 131.5],
      [29.5, 128.5],
      [29.5, 125.0],
      [29.93, 122.28],
    ]
  ),
  'coal-indonesia-china': p(
    PORTS.taboneo.c,
    KALIMANTAN_TO_SCS,
    [
      [23.5, 117.5],
      [25.5, 120.0],
      [28.0, 122.0],
    ],
    PORTS.ningbo.c
  ),
  'coal-indonesia-india': p(
    PORTS.taboneo.c,
    [
      [-4.2, 113.5],
      [-5.4, 110.0],
      [-5.6, 107.6],
    ],
    SUNDA,
    [
      [-6.8, 103.0],
      [-6.0, 99.5],
      [-2.0, 94.0],
      [3.0, 88.0],
      [7.0, 84.0],
      [12.0, 82.0],
      [16.0, 84.0],
      [19.5, 86.5],
    ],
    PORTS.paradip.c
  ),
  'coal-australia-japan': p(
    PORTS.newcastleAu.c,
    [
      [-32.0, 153.5],
      [-27.0, 154.5],
      [-22.0, 154.0],
      [-16.0, 153.2],
    ],
    CORAL_SEA_TO_PHILIPPINE_SEA,
    [
      [8.0, 134.5],
      [14.0, 133.0],
      [20.0, 133.0],
      [26.0, 134.5],
      [31.0, 137.5],
      [34.6, 139.9],
      [35.15, 139.78],
    ],
    PORTS.chiba.c
  ),
  'coal-australia-china': p(
    PORTS.hayPoint.c,
    [
      [-20.5, 151.8],
      [-17.0, 153.0],
    ],
    CORAL_SEA_TO_PHILIPPINE_SEA,
    [
      [7.0, 133.5],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [28.0, 122.9],
    ],
    PORTS.ningbo.c
  ),
  'coal-australia-korea': p(
    PORTS.newcastleAu.c,
    [
      [-32.0, 153.5],
      [-27.0, 154.5],
      [-22.0, 154.0],
      [-16.0, 153.2],
    ],
    CORAL_SEA_TO_PHILIPPINE_SEA,
    [
      [8.0, 134.0],
      [14.0, 131.5],
      [20.0, 130.5],
      [25.0, 129.0],
      [29.0, 128.0],
      [32.0, 127.5],
      [34.0, 128.8],
    ],
    PORTS.ulsan.c
  ),
  'coal-southafrica-india': p(
    PORTS.richardsBay.c,
    [
      [-28.0, 33.5],
      [-25.0, 36.0],
      [-18.0, 41.5],
      [-10.0, 45.0],
      [-2.0, 50.0],
      [6.0, 58.0],
      [14.0, 63.0],
    ],
    TO_KUTCH,
    [[22.6, 69.4]],
    PORTS.mundra.c
  ),
  'coal-russia-china': p(
    PORTS.vostochny.c,
    [
      [41.5, 132.0],
      [39.0, 131.5],
      [36.5, 130.8],
      [34.5, 130.0],
      [33.3, 128.3],
      [32.0, 126.0],
      [30.5, 123.0],
    ],
    PORTS.ningbo.c
  ),
  'iron-australia-china': p(
    PORTS.portHedland.c,
    NWAUSTRALIA_TO_MAKASSAR,
    CELEBES_TO_EASTCHINA,
    [
      [32.0, 122.5],
      [34.5, 122.0],
    ],
    PORTS.qingdao.c
  ),
  'iron-brazil-china': p(
    PORTS.pontaMadeira.c,
    [
      [-1.8, -42.5],
      [-3.5, -37.0],
      [-6.5, -33.5],
      [-14.0, -31.0],
      [-22.0, -30.0],
      [-29.0, -28.0],
      [-34.0, -20.0],
      [-36.5, -8.0],
      [-37.0, 4.0],
      [-36.5, 14.0],
      [-35.4, 20.0],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'iron-brazil-europe': p(
    PORTS.tubarao.c,
    [
      [-21.0, -39.5],
      [-18.0, -36.0],
      [-12.0, -33.0],
      [-5.0, -32.0],
      [2.0, -33.0],
      [8.0, -32.0],
      [14.0, -29.0],
      [22.0, -24.0],
      [30.0, -21.0],
      [34.0, -17.5],
      [38.5, -12.5],
    ],
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'iron-australia-japan': p(
    PORTS.dampier.c,
    NWAUSTRALIA_TO_MAKASSAR,
    [
      [4.5, 125.5],
      [6.0, 127.2],
      [10.0, 128.8],
      [16.0, 129.8],
      [22.0, 131.5],
      [27.5, 134.5],
      [31.0, 136.8],
      [33.5, 138.4],
      [34.6, 139.9],
      [35.15, 139.78],
    ],
    PORTS.chiba.c
  ),
  'iron-guinea-china': p(
    PORTS.morebaya.c,
    [
      [8.5, -14.5],
      [4.0, -16.0],
      [-2.0, -8.0],
      [-8.0, 0.0],
      [-16.0, 6.0],
      [-24.0, 10.0],
      [-32.0, 15.0],
      [-35.6, 18.5],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_NINGBO.slice(0, -2),
    [
      [28.5, 122.4],
      [29.8, 122.7],
    ],
    PORTS.majishan.c
  ),
  'grain-brazil-china': p(
    PORTS.santos.c,
    [
      [-25.0, -45.0],
      [-28.0, -40.0],
      [-31.0, -30.0],
      [-33.5, -18.0],
      [-34.5, -5.0],
      [-35.5, 7.0],
      [-35.4, 20.0],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'grain-usgulf-china': p(
    PORTS.swPass.c,
    USGULF_TO_PANAMA.slice(1),
    PACIFIC_PANAMA_TO_EASTASIA,
    [
      [30.5, -225.0],
      [29.5, -230.0],
      [30.5, -235.0],
      [33.0, -238.0],
      [36.04, -239.4],
    ]
  ),
  'grain-uspnw-japan': p(
    PORTS.columbiaRiver.c,
    [
      [46.5, -126.0],
      [49.0, -135.0],
      [51.0, -150.0],
      [51.0, -165.0],
      [49.0, -178.0],
      [46.0, -190.0],
      [42.0, -203.0],
      [38.0, -213.0],
      [35.2, -218.5],
      [34.6, -220.1],
      [35.15, -220.22],
      [35.45, -219.95],
    ]
  ),
  'grain-ukraine-egypt': p(
    PORTS.pivdennyi.c,
    [
      [45.6, 30.8],
      [44.2, 30.2],
      [42.5, 29.8],
    ],
    BLACK_SEA_OUT.slice(2),
    [
      [34.8, 28.0],
      [33.2, 30.5],
    ],
    PORTS.alexandria.c
  ),
  'grain-russia-egypt': p(
    PORTS.novorossiysk.c,
    [[44.0, 36.0]],
    BLACK_SEA_OUT,
    [
      [34.8, 28.0],
      [33.2, 30.5],
    ],
    PORTS.alexandria.c
  ),
  'grain-argentina-china': p(
    PORTS.rosario.c,
    [
      [-33.3, -60.2],
      [-33.7, -59.4],
      [-34.1, -58.5],
      [-34.6, -57.5],
      [-35.3, -56.3],
      [-37.0, -53.0],
      [-38.0, -48.0],
      [-37.0, -40.0],
      [-36.0, -25.0],
      [-36.0, -10.0],
      [-36.0, 5.0],
      [-35.4, 20.0],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'grain-australia-china': p(
    PORTS.kwinana.c,
    [
      [-31.0, 114.5],
      [-25.0, 111.0],
      [-18.0, 110.0],
      [-12.0, 108.0],
      [-9.0, 106.5],
    ],
    [...SUNDA].reverse(),
    SUNDA_TO_SCS,
    SCS_TO_NINGBO.slice(2)
  ),
  'metals-guinea-china': p(
    PORTS.kamsar.c,
    [
      [10.0, -16.0],
      [6.0, -17.0],
      [0.0, -12.0],
      [-8.0, -2.0],
      [-16.0, 5.0],
      [-24.0, 10.0],
      [-32.0, 15.0],
      [-35.6, 18.5],
    ],
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'metals-chile-china': p(
    PORTS.mejillones.c,
    [
      [-23.5, -72.5],
      [-20.0, -85.0],
      [-12.0, -110.0],
      [-2.0, -140.0],
      [8.0, -170.0],
      [15.0, -195.0],
      [22.0, -215.0],
      [25.0, -230.0],
      [25.2, -234.0], // passage between Okinawa and Miyako
      [27.5, -237.0],
      [30.2, -238.0],
      [29.93, -237.72],
    ]
  ),
  'metals-peru-china': p(
    PORTS.callao.c,
    [
      [-12.5, -79.0],
      [-8.0, -95.0],
      [0.0, -120.0],
      [8.0, -145.0],
      [15.0, -170.0],
      [21.0, -195.0],
      [25.0, -220.0],
      [24.8, -230.0],
      [25.2, -234.0], // passage between Okinawa and Miyako
      [27.5, -237.0],
      [30.2, -238.0],
      [29.93, -237.72],
    ]
  ),
  'fert-gulf-brazil': p(
    PORTS.mesaieed.c,
    [[25.4, 52.3]],
    GULF_OUT.slice(1),
    ARABIAN_TO_CAPE,
    CAPE_TO_BRAZIL.slice(1),
    [[-26.0, -45.5]],
    PORTS.paranagua.c
  ),
  'fert-gulf-india': p(
    PORTS.ruwais.c,
    [
      [24.8, 53.6],
      [25.8, 55.0],
    ],
    GULF_OUT.slice(2),
    [[21.5, 63.0]],
    TO_KUTCH,
    [[22.6, 69.4]],
    PORTS.mundra.c
  ),
  'fert-morocco-brazil': p(
    PORTS.jorfLasfar.c,
    [
      [32.5, -10.2],
      [30.0, -13.0],
      [27.0, -15.5],
      [22.0, -19.0],
      [14.0, -22.0],
      [6.0, -25.0],
      [0.0, -29.0],
      [-6.0, -33.0],
      [-14.0, -36.5],
      [-21.0, -39.5],
      [-23.5, -41.5],
      [-24.8, -44.5],
    ],
    PORTS.santos.c
  ),
  'fert-russia-brazil': p(
    PORTS.ustLuga.c,
    BALTIC_TO_NORTH_SEA.slice(0, -1),
    [
      [52.0, 2.9],
      [51.4, 2.6],
      [50.6, 1.2],
      [49.8, -2.0],
      [48.6, -5.5],
      [46.0, -8.5],
      [43.0, -11.0],
      [36.0, -13.0],
      [28.0, -19.0],
      [20.0, -23.5],
      [15.0, -28.5],
      [8.0, -29.0],
      [0.0, -30.0],
      [-8.0, -33.5],
      [-16.0, -36.5],
      [-21.0, -39.5],
      [-23.5, -41.5],
      [-25.5, -45.5],
    ],
    PORTS.paranagua.c
  ),
  'metals-drc-china-copper': p(
    PORTS.durban.c,
    [
      [-30.5, 32.5],
      [-29.5, 37.0],
      [-28.5, 44.0],
    ],
    CAPE_TO_MALACCA.slice(3),
    MALACCA,
    SCS_TO_NINGBO
  ),
  'metals-chile-japan-copper': p([
      [-23.1, -70.45],
      [-23.5, -72.5],
      [-20.0, -85.0],
      [-12.0, -110.0],
      [-2.0, -140.0],
      [8.0, -170.0],
      [18.0, -197.0],
      [26.0, -212.0],
      [32.0, -218.0],
      [34.6, -220.1],
      [35.15, -220.22],
      [35.45, -219.95],
    ]),
  'metals-australia-china-bauxite': p(
    PORTS.weipa.c,
    [
      [-12.6, 141.4], // out of Albatross Bay into the Gulf of Carpentaria
      [-11.5, 141.3],
      [-10.9, 141.6],
    ],
    TORRES_TO_CORAL.slice(1),
    CORAL_SEA_TO_PHILIPPINE_SEA.slice(1),
    [
      [7.0, 133.5],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [29.0, 123.0],
    ],
    EASTCHINA_TO_YELLOWSEA,
    PORTS.qingdao.c
  ),
  'metals-australia-china-alumina': p(
    PORTS.gladstone.c,
    [
      [-22.5, 153.5],
      [-16.0, 152.8],
    ],
    CORAL_SEA_TO_PHILIPPINE_SEA,
    [
      [7.0, 133.0],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [28.0, 122.9],
    ],
    PORTS.ningbo.c
  ),
  'metals-uae-japan-aluminium': p(
    PORTS.jebelAli.c,
    [[25.6, 55.6]],
    GULF_OUT.slice(2),
    ARABIAN_TO_MALACCA,
    MALACCA,
    SCS_TO_JAPAN
  ),
  'metals-russia-japan-aluminium': p(
    PORTS.vostochny.c,
    [
      [42.0, 133.5],
      [40.5, 135.0],
      [39.0, 137.0],
      [38.6, 138.8],
    ],
    PORTS.niigata.c
  ),
  'metals-indonesia-china-nickel': p(
    PORTS.morowali.c,
    MOLUCCA_NORTHBOUND,
    CELEBES_TO_EASTCHINA.slice(1),
    [[29.5, 122.9]],
    PORTS.ningbo.c
  ),
  'metals-philippines-china-nickel': p(
    PORTS.claver.c,
    [
      [9.8, 126.5],
      [13.0, 126.5],
      [17.0, 124.5],
      [20.5, 122.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [29.0, 123.0],
      [32.0, 122.5],
      [34.5, 121.0],
    ],
    PORTS.rizhao.c
  ),
  'metals-philippines-indonesia-nickel': p(
    PORTS.claver.c,
    [
      [9.5, 126.5], // east of Mindanao
      [7.0, 126.9],
      [5.0, 126.3],
      [2.2, 126.0],
      [0.5, 125.3],
      [-1.0, 124.0],
      [-2.3, 122.8],
    ],
    PORTS.morowali.c
  ),
  'metals-australia-china-zinc': p(
    PORTS.townsville.c,
    QUEENSLAND_TO_CORAL,
    CORAL_SEA_TO_PHILIPPINE_SEA.slice(1),
    [
      [7.0, 133.0],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [29.0, 123.0],
      [32.0, 122.5],
      [34.2, 120.8],
    ],
    PORTS.lianyungang.c
  ),
  'metals-peru-china-zinc': p([
      [-12.05, -77.16],
      [-12.5, -79.0],
      [-8.0, -95.0],
      [0.0, -120.0],
      [8.0, -145.0],
      [15.0, -170.0],
      [21.0, -195.0],
      [25.0, -220.0],
      [24.8, -230.0],
      [25.2, -234.0],
      [28.5, -237.5],
      [32.5, -237.5],
      [34.2, -239.5],
      [34.75, -240.55],
    ]),
  'metals-indonesia-china-tin': p(
    PORTS.pangkalbalam.c,
    [
      [-1.3, 107.0],
      [0.5, 107.2],
      [3.0, 107.2],
      [6.0, 108.5],
    ],
    SCS_TO_NINGBO.slice(2)
  ),
  'crude-guyana-europe': p(
    PORTS.stabroek.c,
    [
      [9.0, -55.0],
      [12.0, -52.0],
      [18.0, -48.0],
      [25.0, -42.0],
      [32.0, -33.0],
      [37.0, -22.0],
      [41.0, -15.0],
      [43.0, -12.0],
    ],
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'fert-canada-brazil': p(
    PORTS.vancouver.c,
    VANCOUVER_OUT,
    [
      [46.0, -127.5],
      [40.0, -127.5],
      [32.0, -122.5],
      [24.0, -113.0],
      [17.0, -104.0],
      [11.0, -92.0],
      [7.5, -84.0],
    ],
    PANAMA_TO_ATLANTIC,
    ATLANTIC_TO_SOUTH_BRAZIL,
    PORTS.paranagua.c
  ),
  'fert-canada-china': p(
    PORTS.vancouver.c,
    VANCOUVER_OUT,
    NORTH_PACIFIC_TO_EASTASIA,
    [[29.93, -237.72]]
  ),
  'grain-canada-china': p(
    PORTS.vancouver.c,
    VANCOUVER_OUT,
    NORTH_PACIFIC_TO_EASTASIA.slice(0, -1),
    [
      [31.5, -237.0],
      [34.0, -238.8],
      [36.04, -239.4],
    ]
  ),
  'coal-colombia-europe': p(
    PORTS.puertoBolivar.c,
    [
      [13.5, -71.5],
      [15.5, -68.0],
      [19.0, -63.5],
      [22.0, -58.0],
      [27.0, -50.0],
      [32.0, -40.0],
      [36.0, -30.0],
      [37.0, -22.0], // south of São Miguel (Azores)
      [40.5, -16.0],
      [43.0, -12.5],
    ],
    IBERIA_TO_ROTTERDAM.slice(1)
  ),
  'metals-australia-china-lithium': p(
    PORTS.bunbury.c,
    [[-33.1, 115.1]],
    SWAUSTRALIA_TO_LOMBOK.slice(3),
    NWAUSTRALIA_TO_MAKASSAR.slice(3),
    CELEBES_TO_EASTCHINA.slice(1),
    [[29.5, 122.9]],
    PORTS.ningbo.c
  ),
  'metals-australia-indonesia-lithium': p(
    PORTS.bunbury.c,
    [[-33.1, 115.1]],
    SWAUSTRALIA_TO_LOMBOK.slice(3),
    [
      [-8.0, 115.9],
      [-7.6, 117.5], // Flores Sea, north of Sumbawa
      [-7.5, 120.0],
      [-6.5, 122.5],
      [-6.0, 124.5], // east of the Wakatobi archipelago
      [-3.5, 124.0],
      [-2.9, 123.0], // Gulf of Tolo
    ],
    PORTS.morowali.c
  ),
  'metals-drc-china-cobalt': p(
    PORTS.durban.c,
    SAFRICA_EASTBOUND,
    CAPE_TO_MALACCA.slice(3),
    MALACCA,
    SCS_TO_NINGBO
  ),
  'metals-southafrica-china-chrome': p(
    PORTS.richardsBay.c,
    [[-29.5, 33.0]],
    SAFRICA_EASTBOUND.slice(1),
    CAPE_TO_MALACCA.slice(3),
    MALACCA,
    SCS_TO_NINGBO
  ),
  'metals-southafrica-china-manganese': p(
    PORTS.ngqura.c,
    [
      [-34.3, 26.5],
      [-34.0, 29.0],
      [-32.5, 31.5],
      [-30.0, 34.0],
    ],
    SAFRICA_EASTBOUND.slice(1),
    CAPE_TO_MALACCA.slice(3),
    MALACCA,
    SCS_TO_QINGDAO
  ),
  'metals-gabon-china-manganese': p(
    PORTS.owendo.c,
    [[0.25, 9.1]],
    GUINEA_GULF_TO_CAPE,
    CAPE_TO_MALACCA,
    MALACCA,
    SCS_TO_NINGBO
  ),
  'metals-australia-china-manganese': p(
    PORTS.grooteEylandt.c,
    [
      [-13.2, 137.5],
      [-11.8, 139.5],
      [-11.0, 141.2],
    ],
    TORRES_TO_CORAL.slice(1),
    CORAL_SEA_TO_PHILIPPINE_SEA.slice(1),
    [
      [7.0, 133.5],
      [12.0, 129.5],
      [18.5, 124.5],
      [21.5, 122.3],
      [25.0, 122.6],
      [29.0, 123.0],
    ],
    EASTCHINA_TO_YELLOWSEA,
    PORTS.qingdao.c
  ),
  'metals-china-japan-rareearths': p(
    PORTS.ningbo.c,
    [
      [30.0, 124.5],
      [30.0, 127.5],
      [29.5, 130.0],
      [30.5, 132.5],
      [32.0, 135.5],
      [33.5, 138.0],
      [34.6, 139.9],
      [35.15, 139.78],
    ],
    PORTS.chiba.c
  ),
  'metals-malaysia-china-rareearths': p(
    PORTS.kuantan.c,
    [
      [4.2, 104.6],
      [6.0, 106.5],
    ],
    SCS_TO_NINGBO.slice(2)
  ),
  'metals-australia-malaysia-rareearths': p(
    PORTS.fremantle.c,
    [
      [-31.0, 114.5],
      [-25.0, 111.0],
      [-18.0, 108.0],
      [-12.0, 105.0],
      [-8.0, 102.0],
      [-4.0, 99.0],
      [1.0, 96.5],
      [5.9, 95.3],
    ],
    MALACCA,
    [
      [2.0, 104.8],
      [3.3, 104.4], // east of Tioman
    ],
    PORTS.kuantan.c
  ),
  'metals-indonesia-singapore-tin': p(
    PORTS.pangkalbalam.c,
    [
      [-1.3, 106.3],
      [0.0, 105.3],
      [0.9, 105.0],
      [1.15, 104.55],
    ],
    PORTS.singapore.c
  ),
};
