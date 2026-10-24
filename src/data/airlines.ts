export interface Airline {
  code: string;
  name: string;
  color: string;
  lowCost: boolean;
  /** Trolley in cabina incluso nella tariffa base. */
  cabinIncluded: boolean;
  /** Fascia di costo per tratta del trolley (se non incluso), in base alla distanza. */
  cabinFee: [number, number];
  /** Fascia di costo per tratta del bagaglio in stiva. */
  checkedFee: [number, number];
  checkedKg: number;
  personalItem: string;
  /** Link di prenotazione con tratta e date precompilate (se l'aerolinea lo supporta). */
  bookingUrl?: (p: BookingParams) => string;
  site: string;
}

export interface BookingParams {
  from: string;
  to: string;
  out: string;
  back: string;
  pax: number;
}

const legacy = (
  code: string,
  name: string,
  color: string,
  site: string,
  checkedFee: [number, number] = [35, 60],
  bookingUrl?: Airline['bookingUrl'],
): Airline => ({
  code,
  name,
  color,
  lowCost: false,
  cabinIncluded: true,
  cabinFee: [0, 0],
  checkedFee,
  checkedKg: 23,
  personalItem: 'Borsa piccola + trolley 8 kg inclusi',
  site,
  bookingUrl,
});

export const AIRLINES: Record<string, Airline> = {
  FR: {
    code: 'FR',
    name: 'Ryanair',
    color: '#073590',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [12, 36],
    checkedFee: [22, 55],
    checkedKg: 20,
    personalItem: 'Borsa piccola 40×30×20 inclusa',
    site: 'https://www.ryanair.com/it/it',
    bookingUrl: (p) =>
      `https://www.ryanair.com/it/it/trip/flights/select?adults=${p.pax}&teens=0&children=0&infants=0` +
      `&dateOut=${p.out}&dateIn=${p.back}&isConnectedFlight=false&discount=0&isReturn=true` +
      `&originIata=${p.from}&destinationIata=${p.to}`,
  },
  U2: {
    code: 'U2',
    name: 'easyJet',
    color: '#ff6600',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [10, 32],
    checkedFee: [24, 52],
    checkedKg: 23,
    personalItem: 'Borsa piccola 45×36×20 inclusa',
    site: 'https://www.easyjet.com/it',
    bookingUrl: (p) =>
      `https://www.easyjet.com/it/buy/flights?dep=${p.from}&dest=${p.to}&dd=${p.out}&rd=${p.back}` +
      `&apax=${p.pax}&cpax=0&ipax=0&isOneWay=off`,
  },
  W6: {
    code: 'W6',
    name: 'Wizz Air',
    color: '#c6007e',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [14, 38],
    checkedFee: [25, 55],
    checkedKg: 20,
    personalItem: 'Borsa piccola 40×30×20 inclusa',
    site: 'https://wizzair.com/it-it',
    bookingUrl: (p) =>
      `https://wizzair.com/it-it/booking/select-flight/${p.from}/${p.to}/${p.out}/${p.back}/${p.pax}/0/0/null`,
  },
  VY: {
    code: 'VY',
    name: 'Vueling',
    color: '#ffcc00',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [12, 30],
    checkedFee: [22, 45],
    checkedKg: 25,
    personalItem: 'Borsa piccola 40×20×30 inclusa',
    site: 'https://www.vueling.com/it',
  },
  V7: {
    code: 'V7',
    name: 'Volotea',
    color: '#e5007d',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [10, 25],
    checkedFee: [20, 40],
    checkedKg: 20,
    personalItem: 'Borsa piccola inclusa',
    site: 'https://www.volotea.com/it',
  },
  PC: {
    code: 'PC',
    name: 'Pegasus',
    color: '#fdb913',
    lowCost: true,
    cabinIncluded: false,
    cabinFee: [15, 30],
    checkedFee: [30, 50],
    checkedKg: 20,
    personalItem: 'Borsa piccola inclusa',
    site: 'https://www.flypgs.com/it',
  },
  AZ: legacy('AZ', 'ITA Airways', '#0b2a5b', 'https://www.ita-airways.com/it_it', [35, 55]),
  BA: legacy('BA', 'British Airways', '#075aaa', 'https://www.britishairways.com/it-it', [40, 65]),
  LH: legacy('LH', 'Lufthansa', '#05164d', 'https://www.lufthansa.com/it/it', [40, 60]),
  AF: legacy('AF', 'Air France', '#002157', 'https://wwws.airfrance.it', [40, 60]),
  KL: legacy('KL', 'KLM', '#00a1de', 'https://www.klm.it', [40, 60]),
  IB: legacy('IB', 'Iberia', '#d7192d', 'https://www.iberia.com/it', [35, 55]),
  TP: legacy('TP', 'TAP Air Portugal', '#e2001a', 'https://www.flytap.com/it-it', [35, 55]),
  EI: legacy('EI', 'Aer Lingus', '#00856f', 'https://www.aerlingus.com/it-it', [30, 50]),
  A3: legacy('A3', 'Aegean', '#0c2f5c', 'https://it.aegeanair.com', [30, 50]),
  SN: legacy('SN', 'Brussels Airlines', '#00285f', 'https://www.brusselsairlines.com/it/it', [35, 55]),
  SK: legacy('SK', 'SAS', '#000a8c', 'https://www.flysas.com/it-it', [35, 55]),
  OS: legacy('OS', 'Austrian', '#e3000f', 'https://www.austrian.com/it/it', [35, 55]),
  KM: legacy('KM', 'KM Malta Airlines', '#d6001c', 'https://www.kmmaltairlines.com', [30, 45]),
  TK: legacy('TK', 'Turkish Airlines', '#c70a0c', 'https://www.turkishairlines.com/it-it', [0, 0]),
  DL: legacy('DL', 'Delta', '#003366', 'https://it.delta.com', [0, 0]),
  EK: legacy('EK', 'Emirates', '#d71a21', 'https://www.emirates.com/it/italian', [0, 0]),
};

export function airline(code: string): Airline {
  return (
    AIRLINES[code] ?? {
      ...legacy(code, code, '#555', `https://www.google.com/search?q=${code}+airline`),
    }
  );
}
