import type { Destination, Route, OriginCode, Tag } from '../types';

type RouteSpec = Partial<Record<OriginCode, string[]>>;

/** "FR" → stesso aeroporto della meta; "FR:STN" → aeroporto specifico. */
function routes(spec: RouteSpec, defaultTo: string): Route[] {
  return (Object.entries(spec) as [OriginCode, string[]][]).flatMap(([from, list]) =>
    list.map((entry) => {
      const [airline, to] = entry.split(':');
      return { from, airline, to: to ?? defaultTo };
    }),
  );
}

function dest(
  code: string,
  city: string,
  country: string,
  flag: string,
  airports: Record<string, string>,
  opts: {
    tz?: number;
    km: number;
    base: number;
    tags: Tag[];
    climate: number[];
    routes: RouteSpec;
    longHaul?: boolean;
    blurb: string;
  },
): Destination {
  return {
    code,
    city,
    country,
    flag,
    airports,
    tz: opts.tz ?? 0,
    distanceKm: opts.km,
    baseFare: opts.base,
    tags: opts.tags,
    climate: opts.climate,
    routes: routes(opts.routes, Object.keys(airports)[0]),
    longHaul: opts.longHaul,
    blurb: opts.blurb,
  };
}

export const DESTINATIONS: Destination[] = [
  dest('BCN', 'Barcellona', 'Spagna', '🇪🇸', { BCN: 'El Prat' }, {
    km: 725, base: 32, tags: ['city', 'mare', 'party', 'cibo'],
    climate: [14, 15, 17, 19, 22, 26, 29, 29, 26, 22, 17, 14],
    routes: { BGY: ['FR'], MXP: ['U2', 'VY'], LIN: ['VY'] },
    blurb: 'Gaudí, tapas al Born e tramonto al Bunker del Carmel.',
  }),
  dest('MAD', 'Madrid', 'Spagna', '🇪🇸', { MAD: 'Barajas' }, {
    km: 1180, base: 40, tags: ['city', 'cibo', 'cultura', 'party'],
    climate: [10, 12, 16, 18, 22, 28, 32, 31, 26, 19, 13, 10],
    routes: { BGY: ['FR'], MXP: ['U2'], LIN: ['IB'] },
    blurb: 'Prado, Retiro e vermut a La Latina la domenica.',
  }),
  dest('VLC', 'Valencia', 'Spagna', '🇪🇸', { VLC: 'Manises' }, {
    km: 990, base: 30, tags: ['mare', 'cibo', 'city'],
    climate: [16, 17, 19, 21, 24, 28, 30, 31, 28, 24, 20, 17],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Paella vera, Città delle Arti e spiaggia della Malvarrosa.',
  }),
  dest('SVQ', 'Siviglia', 'Spagna', '🇪🇸', { SVQ: 'San Pablo' }, {
    km: 1560, base: 42, tags: ['city', 'cultura', 'cibo'],
    climate: [16, 18, 22, 24, 28, 33, 36, 36, 32, 26, 20, 17],
    routes: { BGY: ['FR'] },
    blurb: 'Alcázar, flamenco a Triana e aranci ovunque.',
  }),
  dest('AGP', 'Malaga', 'Spagna', '🇪🇸', { AGP: 'Costa del Sol' }, {
    km: 1550, base: 45, tags: ['mare', 'cibo', 'city'],
    climate: [17, 18, 20, 22, 25, 28, 31, 31, 28, 24, 20, 18],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Sole anche a gennaio, Picasso e pescaíto frito.',
  }),
  dest('PMI', 'Palma di Maiorca', 'Spagna', '🇪🇸', { PMI: 'Son Sant Joan' }, {
    km: 800, base: 38, tags: ['mare', 'natura'],
    climate: [15, 15, 17, 19, 23, 27, 30, 31, 27, 23, 19, 16],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Calette turchesi e la Serra de Tramuntana.',
  }),
  dest('IBZ', 'Ibiza', 'Spagna', '🇪🇸', { IBZ: 'Ibiza' }, {
    km: 900, base: 45, tags: ['mare', 'party'],
    climate: [15, 16, 17, 19, 23, 27, 30, 31, 28, 24, 19, 16],
    routes: { BGY: ['FR'], MXP: ['U2', 'VY'] },
    blurb: 'Tramonti a Benirràs e notti che finiscono all’alba.',
  }),
  dest('TFS', 'Tenerife', 'Spagna', '🇪🇸', { TFS: 'Tenerife Sud' }, {
    tz: -1, km: 3200, base: 85, tags: ['mare', 'natura'],
    climate: [21, 21, 22, 23, 24, 26, 28, 29, 28, 26, 24, 22],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Estate eterna, il Teide e balene al largo.',
  }),
  dest('FUE', 'Fuerteventura', 'Spagna', '🇪🇸', { FUE: 'Fuerteventura' }, {
    tz: -1, km: 3100, base: 80, tags: ['mare', 'natura'],
    climate: [21, 21, 22, 23, 24, 25, 27, 27, 27, 26, 24, 22],
    routes: { BGY: ['FR'] },
    blurb: 'Dune, kitesurf e spiagge infinite.',
  }),
  dest('LIS', 'Lisbona', 'Portogallo', '🇵🇹', { LIS: 'Humberto Delgado' }, {
    tz: -1, km: 1700, base: 55, tags: ['city', 'mare', 'cibo', 'cultura'],
    climate: [15, 16, 19, 20, 22, 26, 28, 29, 27, 23, 18, 15],
    routes: { BGY: ['FR'], MXP: ['U2', 'TP'] },
    blurb: 'Tram 28, pastéis de nata e surf a Cascais.',
  }),
  dest('OPO', 'Porto', 'Portogallo', '🇵🇹', { OPO: 'Francisco Sá Carneiro' }, {
    tz: -1, km: 1580, base: 48, tags: ['city', 'cibo', 'cultura'],
    climate: [14, 15, 17, 18, 20, 23, 25, 25, 24, 21, 17, 14],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Azulejos, cantine di Porto e la Ribeira al tramonto.',
  }),
  dest('FNC', 'Madeira', 'Portogallo', '🇵🇹', { FNC: 'Cristiano Ronaldo' }, {
    tz: -1, km: 2900, base: 90, tags: ['natura', 'mare'],
    climate: [19, 19, 20, 20, 21, 23, 25, 26, 26, 24, 22, 20],
    routes: { MXP: ['U2'] },
    blurb: 'Levadas tra le nuvole e piscine naturali.',
  }),
  dest('PAR', 'Parigi', 'Francia', '🇫🇷', { CDG: 'Charles de Gaulle', ORY: 'Orly', BVA: 'Beauvais' }, {
    km: 640, base: 45, tags: ['city', 'cultura', 'cibo'],
    climate: [7, 9, 13, 16, 20, 23, 25, 25, 21, 16, 11, 8],
    routes: { BGY: ['FR:BVA'], MXP: ['U2:CDG', 'AF:CDG'], LIN: ['AF:CDG', 'V7:ORY'] },
    blurb: 'Croissant, Marais e la Senna di sera.',
  }),
  dest('LON', 'Londra', 'Regno Unito', '🇬🇧', { LGW: 'Gatwick', STN: 'Stansted', LHR: 'Heathrow' }, {
    tz: -1, km: 960, base: 42, tags: ['city', 'cultura', 'party'],
    climate: [8, 9, 12, 15, 18, 21, 23, 23, 20, 16, 11, 9],
    routes: { BGY: ['FR:STN'], MXP: ['U2:LGW', 'FR:STN'], LIN: ['BA:LHR', 'U2:LGW'] },
    blurb: 'Musei gratis, mercati a Shoreditch e pub di quartiere.',
  }),
  dest('EDI', 'Edimburgo', 'Regno Unito', '🏴', { EDI: 'Edimburgo' }, {
    tz: -1, km: 1500, base: 50, tags: ['city', 'natura', 'cultura'],
    climate: [7, 7, 9, 12, 15, 17, 19, 19, 16, 13, 9, 7],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Castello, whisky e trekking su Arthur’s Seat.',
  }),
  dest('DUB', 'Dublino', 'Irlanda', '🇮🇪', { DUB: 'Dublino' }, {
    tz: -1, km: 1450, base: 45, tags: ['city', 'party', 'natura'],
    climate: [8, 9, 10, 13, 15, 18, 20, 19, 17, 14, 10, 8],
    routes: { BGY: ['FR'], MXP: ['EI'], LIN: ['EI'] },
    blurb: 'Live music a Temple Bar e scogliere a Howth.',
  }),
  dest('AMS', 'Amsterdam', 'Paesi Bassi', '🇳🇱', { AMS: 'Schiphol', EIN: 'Eindhoven' }, {
    km: 830, base: 55, tags: ['city', 'party', 'cultura'],
    climate: [6, 7, 10, 14, 17, 20, 22, 22, 19, 15, 10, 7],
    routes: { BGY: ['FR:EIN'], MXP: ['U2:AMS', 'KL:AMS'], LIN: ['KL:AMS'] },
    blurb: 'Canali in bici, Van Gogh e brown café.',
  }),
  dest('BRU', 'Bruxelles', 'Belgio', '🇧🇪', { BRU: 'Zaventem', CRL: 'Charleroi' }, {
    km: 700, base: 40, tags: ['city', 'cibo', 'cultura'],
    climate: [6, 7, 11, 15, 19, 21, 23, 23, 20, 15, 10, 7],
    routes: { BGY: ['FR:CRL'], MXP: ['SN:BRU'], LIN: ['SN:BRU'] },
    blurb: 'Birre trappiste, fumetti e gita a Bruges.',
  }),
  dest('BER', 'Berlino', 'Germania', '🇩🇪', { BER: 'Brandenburg' }, {
    km: 840, base: 38, tags: ['city', 'party', 'cultura'],
    climate: [3, 5, 9, 15, 19, 23, 25, 24, 20, 14, 8, 4],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Club leggendari, street art e storia ad ogni angolo.',
  }),
  dest('MUC', 'Monaco di Baviera', 'Germania', '🇩🇪', { MUC: 'Franz Josef Strauss' }, {
    km: 350, base: 70, tags: ['city', 'cibo'],
    climate: [3, 5, 10, 15, 19, 22, 24, 24, 20, 14, 8, 4],
    routes: { LIN: ['LH'], MXP: ['LH'] },
    blurb: 'Biergarten, mercatini e Alpi a un’ora.',
  }),
  dest('VIE', 'Vienna', 'Austria', '🇦🇹', { VIE: 'Schwechat' }, {
    km: 620, base: 40, tags: ['city', 'cultura', 'cibo'],
    climate: [3, 6, 11, 16, 21, 24, 27, 26, 21, 15, 8, 4],
    routes: { BGY: ['FR'], LIN: ['OS'] },
    blurb: 'Caffè storici, Klimt e Sachertorte.',
  }),
  dest('PRG', 'Praga', 'Rep. Ceca', '🇨🇿', { PRG: 'Václav Havel' }, {
    km: 690, base: 35, tags: ['city', 'cultura', 'party'],
    climate: [2, 4, 9, 14, 19, 22, 24, 24, 19, 13, 7, 3],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Ponte Carlo all’alba e birra a 2 euro.',
  }),
  dest('BUD', 'Budapest', 'Ungheria', '🇭🇺', { BUD: 'Liszt Ferenc' }, {
    km: 790, base: 30, tags: ['city', 'party', 'cultura'],
    climate: [3, 6, 11, 17, 22, 25, 28, 27, 22, 16, 9, 4],
    routes: { BGY: ['FR', 'W6'], MXP: ['W6'] },
    blurb: 'Terme Széchenyi e ruin pub nel quartiere ebraico.',
  }),
  dest('KRK', 'Cracovia', 'Polonia', '🇵🇱', { KRK: 'Giovanni Paolo II' }, {
    km: 1000, base: 32, tags: ['city', 'cultura'],
    climate: [1, 3, 8, 14, 19, 22, 24, 24, 19, 13, 7, 2],
    routes: { BGY: ['FR'], MXP: ['W6'] },
    blurb: 'Rynek, Kazimierz e pierogi a volontà.',
  }),
  dest('CPH', 'Copenaghen', 'Danimarca', '🇩🇰', { CPH: 'Kastrup' }, {
    km: 1150, base: 48, tags: ['city', 'cultura', 'cibo'],
    climate: [3, 3, 6, 11, 16, 19, 22, 21, 17, 12, 7, 4],
    routes: { BGY: ['FR'], MXP: ['SK'] },
    blurb: 'Design nordico, Nyhavn e smørrebrød.',
  }),
  dest('STO', 'Stoccolma', 'Svezia', '🇸🇪', { ARN: 'Arlanda' }, {
    km: 1650, base: 50, tags: ['city', 'natura', 'cultura'],
    climate: [0, 1, 4, 10, 16, 20, 23, 21, 16, 10, 5, 1],
    routes: { MXP: ['SK'] },
    blurb: 'Gamla Stan, fika e arcipelago in battello.',
  }),
  dest('ATH', 'Atene', 'Grecia', '🇬🇷', { ATH: 'Eleftherios Venizelos' }, {
    tz: 1, km: 1500, base: 50, tags: ['city', 'cultura', 'mare'],
    climate: [13, 14, 17, 20, 25, 30, 33, 33, 29, 24, 19, 15],
    routes: { BGY: ['FR'], MXP: ['A3', 'U2'] },
    blurb: 'Acropoli al tramonto e traghetto per le isole.',
  }),
  dest('HER', 'Creta', 'Grecia', '🇬🇷', { HER: 'Heraklion' }, {
    tz: 1, km: 1950, base: 60, tags: ['mare', 'natura', 'cibo'],
    climate: [16, 16, 17, 20, 24, 28, 29, 29, 27, 24, 21, 18],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Balos, gole di Samaria e raki offerto dalla casa.',
  }),
  dest('SPU', 'Spalato', 'Croazia', '🇭🇷', { SPU: 'Spalato' }, {
    km: 600, base: 45, tags: ['mare', 'natura'],
    climate: [11, 12, 14, 18, 23, 27, 30, 30, 26, 21, 16, 12],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Palazzo di Diocleziano e isole a portata di catamarano.',
  }),
  dest('TIA', 'Tirana', 'Albania', '🇦🇱', { TIA: 'Madre Teresa' }, {
    km: 900, base: 35, tags: ['city', 'mare', 'natura'],
    climate: [12, 13, 16, 20, 24, 28, 31, 31, 28, 23, 17, 13],
    routes: { BGY: ['W6', 'FR'], MXP: ['W6'] },
    blurb: 'La porta per la Riviera albanese, ancora low cost.',
  }),
  dest('OTP', 'Bucarest', 'Romania', '🇷🇴', { OTP: 'Henri Coandă' }, {
    tz: 1, km: 1400, base: 30, tags: ['city', 'party'],
    climate: [2, 5, 11, 18, 23, 27, 30, 30, 25, 18, 10, 4],
    routes: { BGY: ['W6', 'FR'], MXP: ['W6'] },
    blurb: 'Palazzi Belle Époque e vita notturna nel Centro Vechi.',
  }),
  dest('MLA', 'Malta', 'Malta', '🇲🇹', { MLA: 'Luqa' }, {
    km: 1250, base: 40, tags: ['mare', 'cultura', 'party'],
    climate: [16, 16, 18, 20, 24, 28, 31, 32, 28, 25, 21, 17],
    routes: { BGY: ['FR'], MXP: ['KM'] },
    blurb: 'La Valletta, Gozo e Blue Lagoon a Comino.',
  }),
  dest('RAK', 'Marrakech', 'Marocco', '🇲🇦', { RAK: 'Menara' }, {
    km: 2000, base: 50, tags: ['city', 'cultura', 'cibo'],
    climate: [18, 20, 23, 25, 29, 33, 37, 37, 32, 28, 22, 19],
    routes: { BGY: ['FR'], MXP: ['U2'] },
    blurb: 'Souk, riad con patio e notte nel deserto di Agafay.',
  }),
  dest('IST', 'Istanbul', 'Turchia', '🇹🇷', { IST: 'Istanbul', SAW: 'Sabiha Gökçen' }, {
    tz: 2, km: 1650, base: 70, tags: ['city', 'cultura', 'cibo'],
    climate: [9, 9, 12, 17, 22, 27, 29, 29, 25, 20, 15, 11],
    routes: { BGY: ['PC:SAW'], MXP: ['TK:IST', 'PC:SAW'] },
    blurb: 'Due continenti, bazar e çay sul Bosforo.',
  }),
  dest('CTA', 'Catania', 'Italia', '🇮🇹', { CTA: 'Fontanarossa' }, {
    km: 1050, base: 35, tags: ['mare', 'cibo', 'natura'],
    climate: [15, 16, 18, 20, 24, 29, 32, 32, 29, 25, 20, 16],
    routes: { BGY: ['FR'], MXP: ['U2', 'FR'], LIN: ['AZ'] },
    blurb: 'Etna, granita e brioche e barocco a Noto.',
  }),
  dest('PMO', 'Palermo', 'Italia', '🇮🇹', { PMO: 'Falcone Borsellino' }, {
    km: 900, base: 35, tags: ['mare', 'cibo', 'cultura'],
    climate: [15, 15, 17, 19, 23, 27, 30, 30, 28, 24, 20, 16],
    routes: { BGY: ['FR'], MXP: ['U2'], LIN: ['AZ'] },
    blurb: 'Street food a Ballarò e Mondello a 20 minuti.',
  }),
  dest('NAP', 'Napoli', 'Italia', '🇮🇹', { NAP: 'Capodichino' }, {
    km: 650, base: 30, tags: ['city', 'cibo', 'mare'],
    climate: [13, 14, 16, 19, 23, 27, 30, 30, 27, 22, 18, 14],
    routes: { BGY: ['FR'], MXP: ['U2'], LIN: ['AZ'] },
    blurb: 'Pizza, Spaccanapoli e Costiera a un passo.',
  }),
  dest('BRI', 'Bari', 'Italia', '🇮🇹', { BRI: 'Karol Wojtyła' }, {
    km: 750, base: 30, tags: ['mare', 'cibo'],
    climate: [13, 14, 16, 19, 23, 28, 31, 31, 27, 22, 18, 14],
    routes: { BGY: ['FR'], MXP: ['U2'], LIN: ['AZ'] },
    blurb: 'Orecchiette di Bari Vecchia e Polignano a Mare.',
  }),
  dest('BDS', 'Brindisi', 'Italia', '🇮🇹', { BDS: 'Salento' }, {
    km: 850, base: 32, tags: ['mare', 'cibo'],
    climate: [14, 14, 16, 19, 23, 28, 31, 31, 27, 23, 18, 15],
    routes: { BGY: ['FR'], LIN: ['AZ'] },
    blurb: 'Porta del Salento: Lecce, Otranto e pajare.',
  }),
  dest('CAG', 'Cagliari', 'Italia', '🇮🇹', { CAG: 'Elmas' }, {
    km: 680, base: 32, tags: ['mare', 'natura'],
    climate: [14, 15, 17, 19, 23, 28, 31, 31, 28, 24, 19, 15],
    routes: { BGY: ['FR'], LIN: ['AZ'] },
    blurb: 'Poetto, fenicotteri e Villasimius.',
  }),
  dest('OLB', 'Olbia', 'Italia', '🇮🇹', { OLB: 'Costa Smeralda' }, {
    km: 520, base: 40, tags: ['mare', 'natura'],
    climate: [14, 14, 16, 19, 23, 27, 30, 30, 27, 23, 18, 15],
    routes: { MXP: ['U2'], LIN: ['AZ'] },
    blurb: 'Costa Smeralda, La Maddalena e acqua da Caraibi.',
  }),
  dest('NYC', 'New York', 'Stati Uniti', '🇺🇸', { JFK: 'John F. Kennedy' }, {
    tz: -6, km: 6400, base: 260, tags: ['city', 'cultura', 'cibo'], longHaul: true,
    climate: [4, 5, 10, 16, 22, 27, 29, 29, 25, 18, 12, 6],
    routes: { MXP: ['DL', 'EK'] },
    blurb: 'Skyline, Central Park e brunch a Brooklyn.',
  }),
  dest('DXB', 'Dubai', 'Emirati Arabi', '🇦🇪', { DXB: 'Dubai International' }, {
    tz: 3, km: 4600, base: 230, tags: ['mare', 'city'], longHaul: true,
    climate: [24, 25, 28, 33, 38, 40, 41, 42, 39, 35, 30, 26],
    routes: { MXP: ['EK'] },
    blurb: 'Grattacieli, deserto e mare caldo d’inverno.',
  }),
];

export const DESTINATION_BY_CODE: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.code, d]),
);

export const TAG_LABELS: Record<Tag, string> = {
  mare: '🏖️ Mare',
  city: '🏙️ City',
  cibo: '🍝 Cibo',
  party: '🎉 Party',
  natura: '🥾 Natura',
  cultura: '🏛️ Cultura',
};

/** Mete scoperte a runtime dal provider live (non presenti nel catalogo). */
export function registerDestination(d: Destination): void {
  if (!DESTINATION_BY_CODE[d.code]) DESTINATION_BY_CODE[d.code] = d;
}

/** Codice meta del catalogo che serve un certo aeroporto di arrivo. */
export function destinationForAirport(iata: string): Destination | undefined {
  return DESTINATIONS.find((d) => iata in d.airports);
}

export function flagOf(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}
