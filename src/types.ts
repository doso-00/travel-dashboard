export type OriginCode = 'MXP' | 'BGY' | 'LIN';
export type TripMode = 'flash' | 'weekend' | 'long-weekend' | 'week';
export type Baggage = 'personal' | 'cabin' | 'checked';
export type Tag = 'mare' | 'city' | 'cibo' | 'party' | 'natura' | 'cultura';

export interface Route {
  from: OriginCode;
  airline: string;
  /** Aeroporto di arrivo (es. STN per Londra da BGY). */
  to: string;
}

export interface Destination {
  /** Codice città/meta, usato come chiave (es. LON). */
  code: string;
  city: string;
  country: string;
  flag: string;
  /** Nome degli aeroporti di arrivo, per codice IATA. */
  airports: Record<string, string>;
  /** Differenza di fuso orario rispetto all'Italia, in ore. */
  tz: number;
  distanceKm: number;
  /** Tariffa base indicativa per tratta, low cost, bassa stagione. */
  baseFare: number;
  tags: Tag[];
  /** Temperatura massima media, da gennaio a dicembre. */
  climate: number[];
  routes: Route[];
  longHaul?: boolean;
  blurb: string;
}

export interface Flight {
  flightNumber: string;
  airline: string;
  from: string;
  to: string;
  /** Ora locale di partenza, formato YYYY-MM-DDTHH:mm. */
  departure: string;
  /** Ora locale di arrivo, formato YYYY-MM-DDTHH:mm. */
  arrival: string;
  durationMin: number;
  terminal?: string;
  /** Tariffa base per passeggero, in EUR. */
  fare: number;
}

export interface TripOption {
  id: string;
  mode: TripMode;
  destination: string;
  origin: OriginCode;
  airline: string;
  outbound: Flight;
  inbound: Flight;
  /** Tariffa base A/R per passeggero, senza bagagli. */
  fare: number;
  source: 'demo' | 'ryanair' | 'travelpayouts';
}

export interface DateWindow {
  mode: TripMode;
  out: string;
  back: string;
  nights: number;
}

export interface Prefs {
  origins: OriginCode[];
  baggage: Baggage;
  pax: number;
  includeTransfer: boolean;
  horizonWeeks: number;
  maxBudget: number | null;
  tags: Tag[];
  afterWork: boolean;
  modes: TripMode[];
  provider: 'demo' | 'live';
}

export interface CostBreakdown {
  fare: number;
  baggage: number;
  transfer: number;
  perPax: number;
  total: number;
}

export interface PricedTrip extends TripOption {
  cost: CostBreakdown;
}

export interface DestinationResult {
  destination: Destination;
  mode: TripMode;
  best: PricedTrip;
  options: PricedTrip[];
  /** Media della tariffa base nel periodo osservato (null se non nota). */
  avgFare: number | null;
  /** Sconto percentuale rispetto alla media (positivo = più economico). */
  dealPct: number | null;
}

export interface PriceAlert {
  id: string;
  destination: string;
  mode: TripMode | 'any';
  maxPrice: number | null;
  dropPct: number | null;
  createdAt: string;
  lastNotified?: string;
}

export interface AlertHit {
  alert: PriceAlert;
  result: DestinationResult;
  reason: string;
}
