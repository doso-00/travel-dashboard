import { terminalFor, type OriginAirport } from '../data/airports';
import { DESTINATION_BY_CODE, destinationForAirport } from '../data/destinations';
import { addDays, addMinutes } from '../lib/dates';
import type { Flight, OriginCode, TripOption } from '../types';
import type { FlightProvider } from './types';

// Aviasales Data API (Travelpayouts): gratuita con un token personale, copre
// tutte le compagnie. Sono prezzi in cache trovati dagli utenti Aviasales
// nelle ultime ~48 ore, quindi alcune date possono mancare e sotto data
// il prezzo cambia troppo in fretta: si usano solo partenze tra 7+ giorni.
// https://support.travelpayouts.com/hc/en-us/articles/203956163

interface TpTicket {
  origin_airport: string;
  destination: string;
  destination_airport: string;
  price: number;
  airline: string;
  flight_number: string | number;
  departure_at: string;
  return_at?: string;
  transfers: number;
  return_transfers?: number;
  duration_to?: number;
  duration_back?: number;
  found_at?: string;
}

const MIN_DAYS_AHEAD = 7;

const MILAN: OriginCode[] = ['MXP', 'BGY', 'LIN'];

function leg(airline: string, number: string | number, from: string, to: string, departureAt: string, durationMin: number, tzShift: number, fare: number): Flight {
  const departure = departureAt.slice(0, 16);
  return {
    flightNumber: `${airline}${number}`,
    airline,
    from,
    to,
    departure,
    arrival: addMinutes(departure, durationMin + tzShift * 60),
    durationMin,
    terminal: terminalFor(from, airline),
    fare,
  };
}

export const createTravelpayoutsProvider = (token: string): FlightProvider => ({
  id: 'travelpayouts',
  label: 'Travelpayouts',

  async search(mode, windows, ctx) {
    const pairs = new Set(windows.map((w) => `${w.out}>${w.back}`));
    const months = [...new Set(windows.filter((w) => w.out >= addDays(ctx.today, MIN_DAYS_AHEAD)).map((w) => w.out.slice(0, 7)))];
    const trips: TripOption[] = [];
    for (const month of months) {
      const params = new URLSearchParams({
        origin: 'MIL',
        departure_at: month,
        one_way: 'false',
        direct: 'true',
        currency: 'eur',
        market: 'it',
        sorting: 'price',
        unique: 'false',
        limit: '1000',
        token,
      });
      const res = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`);
      if (!res.ok) throw new Error(`Travelpayouts ${res.status} ${(await res.text()).slice(0, 120)}`);
      const body = (await res.json()) as { success?: boolean; data?: TpTicket[]; error?: string };
      if (body.success === false) throw new Error(`Travelpayouts: ${body.error ?? 'errore'}`);
      for (const t of body.data ?? []) {
        const origin = t.origin_airport as OriginAirport['code'];
        if (!t.return_at || t.transfers || t.return_transfers || !MILAN.includes(origin) || !ctx.origins.includes(origin)) continue;
        const out = t.departure_at.slice(0, 10);
        const back = t.return_at.slice(0, 10);
        if (!pairs.has(`${out}>${back}`) || out < addDays(ctx.today, MIN_DAYS_AHEAD)) continue;
        const d = destinationForAirport(t.destination_airport) ?? DESTINATION_BY_CODE[t.destination];
        if (!d) continue;
        const half = Math.round((t.price / 2) * 100) / 100;
        const outbound = leg(t.airline, t.flight_number, origin, t.destination_airport, t.departure_at, t.duration_to ?? 120, d.tz, half);
        // Il numero del volo di rientro non è fornito.
        const inbound = leg(t.airline, '', t.destination_airport, origin, t.return_at, t.duration_back ?? 120, -d.tz, half);
        trips.push({
          id: `${mode}:${d.code}:${origin}:${t.airline}:${out}:${back}`,
          mode,
          destination: d.code,
          origin,
          airline: t.airline,
          outbound,
          inbound,
          fare: t.price,
          source: 'travelpayouts',
          seenAt: t.found_at,
        });
      }
    }
    return trips;
  },
});
