import { ORIGINS } from '../data/airports';
import { destinationForAirport, flagOf, registerDestination } from '../data/destinations';
import { addMinutes, localDateTime, minutesBetween, weekday } from '../lib/dates';
import type { DateWindow, Flight, OriginCode, TripOption } from '../types';
import type { FlightProvider } from './types';

// Tariffe pubbliche Ryanair (fare finder): restituiscono il prezzo A/R più
// basso per ogni meta dato un intervallo di date. Passano dal proxy Vite
// (/api/ryanair), quindi funzionano con `npm run dev` o `npm run preview`.

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
// Ryanair non vola da Linate.
const RYANAIR_ORIGINS: OriginCode[] = ['BGY', 'MXP'];

interface FareLeg {
  departureAirport: { iataCode: string };
  arrivalAirport: { iataCode: string; name?: string; countryName?: string; city?: { name?: string; countryCode?: string } };
  departureDate: string;
  arrivalDate: string;
  price: { value: number };
  flightNumber?: string;
}

interface FareResponse {
  fares?: { outbound: FareLeg; inbound: FareLeg }[];
}

function toFlight(leg: FareLeg, terminal?: string): Flight {
  const departure = leg.departureDate.slice(0, 16);
  const arrival = leg.arrivalDate.slice(0, 16);
  return {
    flightNumber: (leg.flightNumber ?? 'FR').replace(/\s+/g, ''),
    airline: 'FR',
    from: leg.departureAirport.iataCode,
    to: leg.arrivalAirport.iataCode,
    departure,
    arrival,
    // Gli orari sono locali: la durata reale non è nota, è una stima senza fuso.
    durationMin: Math.max(30, minutesBetween(departure, arrival)),
    terminal,
    fare: leg.price.value,
  };
}

function destinationCode(leg: FareLeg): string {
  const known = destinationForAirport(leg.arrivalAirport.iataCode);
  if (known) return known.code;
  const iata = leg.arrivalAirport.iataCode;
  registerDestination({
    code: iata,
    city: leg.arrivalAirport.city?.name ?? leg.arrivalAirport.name ?? iata,
    country: leg.arrivalAirport.countryName ?? '',
    flag: leg.arrivalAirport.city?.countryCode ? flagOf(leg.arrivalAirport.city.countryCode) : '✈️',
    airports: { [iata]: leg.arrivalAirport.name ?? iata },
    tz: 0,
    distanceKm: 1500,
    baseFare: 40,
    tags: [],
    climate: [],
    routes: [],
    blurb: 'Meta trovata dalle tariffe live Ryanair.',
  });
  return iata;
}

/** Raggruppa le finestre per (giorno di partenza, notti): una richiesta per gruppo. */
function groups(windows: DateWindow[]): DateWindow[][] {
  const map = new Map<string, DateWindow[]>();
  for (const w of windows) {
    const key = `${weekday(w.out)}-${w.nights}`;
    map.set(key, [...(map.get(key) ?? []), w]);
  }
  return [...map.values()];
}

async function fetchGroup(origin: OriginCode, group: DateWindow[], timeFrom: string): Promise<FareResponse> {
  const outs = group.map((w) => w.out).sort();
  const backs = group.map((w) => w.back).sort();
  const params = new URLSearchParams({
    departureAirportIataCode: origin,
    outboundDepartureDateFrom: outs[0],
    outboundDepartureDateTo: outs[outs.length - 1],
    inboundDepartureDateFrom: backs[0],
    inboundDepartureDateTo: backs[backs.length - 1],
    outboundDepartureDaysOfWeek: DAYS[weekday(outs[0])],
    durationFrom: String(group[0].nights),
    durationTo: String(group[0].nights),
    outboundDepartureTimeFrom: timeFrom,
    outboundDepartureTimeTo: '23:59',
    currency: 'EUR',
    market: 'it-it',
    language: 'it',
  });
  const res = await fetch(`/api/ryanair/farfnd/v4/roundTripFares?${params}`);
  if (!res.ok) throw new Error(`Ryanair ${res.status}`);
  return res.json();
}

export const ryanairProvider: FlightProvider = {
  id: 'ryanair',
  label: 'Live Ryanair',

  async search(mode, windows, ctx) {
    const origins = RYANAIR_ORIGINS.filter((o) => ctx.origins.includes(o));
    const nowLocal = localDateTime(ctx.now);
    const requests = origins.flatMap((origin) =>
      groups(windows).map(async (group) => {
        let timeFrom = '00:00';
        if (mode === 'flash') timeFrom = addMinutes(nowLocal, ORIGINS[origin].bufferMin).slice(11);
        else if (mode === 'weekend' && ctx.afterWork && weekday(group[0].out) === 5) timeFrom = '17:00';
        const data = await fetchGroup(origin, group, timeFrom);
        return (data.fares ?? []).map((f): TripOption => {
          const outbound = toFlight(f.outbound, origin === 'MXP' ? 'T1' : undefined);
          const inbound = toFlight(f.inbound);
          const destination = destinationCode(f.outbound);
          return {
            id: `${mode}:${destination}:${origin}:FR:${outbound.departure.slice(0, 10)}:${inbound.departure.slice(0, 10)}`,
            mode,
            destination,
            origin,
            airline: 'FR',
            outbound,
            inbound,
            fare: Math.round((outbound.fare + inbound.fare) * 100) / 100,
            source: 'ryanair',
          };
        });
      }),
    );
    const settled = await Promise.allSettled(requests);
    const ok = settled.filter((s): s is PromiseFulfilledResult<TripOption[]> => s.status === 'fulfilled');
    if (requests.length && !ok.length) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }
    return ok.flatMap((s) => s.value);
  },
};
