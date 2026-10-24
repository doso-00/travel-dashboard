import { airline } from '../data/airlines';
import { ORIGINS, terminalFor } from '../data/airports';
import { DESTINATIONS } from '../data/destinations';
import { holidayName } from '../data/holidays';
import { addDays, addMinutes, daysBetween, localDateTime, monthIndex, weekday } from '../lib/dates';
import { rand } from '../lib/random';
import type { Destination, Flight, Route, TripOption } from '../types';
import type { FlightProvider } from './types';

// Motore dimostrativo: orari e prezzi sono generati in modo deterministico
// con le dinamiche tipiche delle low cost (giorno della settimana, anticipo,
// stagione, festività, fascia oraria, promo). Cambiano ogni giorno, così le
// medie storiche e gli alert hanno senso.

type Direction = 'out' | 'in';

const SLOTS = ['06:10', '07:05', '08:35', '10:20', '12:45', '14:30', '16:15', '17:50', '19:35', '21:15'];

const OUT_DOW = [1.05, 0.9, 0.82, 0.85, 1.0, 1.25, 1.0]; // dom..sab
const IN_DOW = [1.3, 1.12, 0.85, 0.82, 0.9, 1.0, 0.9];

function routeKey(r: Route) {
  return `${r.from}-${r.airline}-${r.to}`;
}

function flightDuration(d: Destination): number {
  const raw = d.longHaul ? 45 + d.distanceKm / 12 : 35 + d.distanceKm / 12.5;
  return Math.round(raw / 5) * 5;
}

/** Slot di partenza della rotta (stabili nel tempo, come un orario stagionale). */
function slotsFor(r: Route, dir: Direction): string[] {
  const a = airline(r.airline);
  const count = a.lowCost ? 1 + Math.floor(rand(routeKey(r), dir, 'n') * 2) : 2 + Math.floor(rand(routeKey(r), dir, 'n') * 2);
  const picked = new Set<string>();
  for (let i = 0; picked.size < count && i < 20; i++) {
    picked.add(SLOTS[Math.floor(rand(routeKey(r), dir, 'slot', i) * SLOTS.length)]);
  }
  return [...picked].sort();
}

function operates(r: Route, date: string, dir: Direction): boolean {
  if (!airline(r.airline).lowCost) return true;
  // Le rotte low cost meno frequenti non volano tutti i giorni.
  return rand(routeKey(r), dir, 'dow', weekday(date)) < 0.8;
}

function seasonFactor(d: Destination, date: string): number {
  const m = monthIndex(date);
  const md = date.slice(5);
  if (md >= '12-20' || md <= '01-06') return 1.4;
  const winterSun = d.tags.includes('mare') && d.climate[m] >= 20;
  const base = [0.82, 0.8, 0.9, 1.05, 1.05, 1.2, 1.45, 1.5, 1.15, 1.0, 0.85, 0.9][m];
  return winterSun && (m <= 2 || m >= 10) ? base * 1.25 : base;
}

function leadFactor(lead: number): number {
  if (lead <= 0) return 2.0;
  if (lead <= 2) return 1.7;
  if (lead <= 6) return 1.4;
  if (lead <= 13) return 1.15;
  if (lead <= 29) return 1.0;
  if (lead <= 59) return 0.88;
  return 0.95;
}

function hourFactor(time: string): number {
  const h = Number(time.slice(0, 2));
  if (h < 8) return 0.85;
  if (h < 12) return 1.0;
  if (h < 17) return 0.93;
  if (h < 21) return 1.15;
  return 0.9;
}

function holidayFactor(date: string): number {
  return [-1, 0, 1].some((o) => holidayName(addDays(date, o))) ? 1.25 : 1;
}

function weekKey(date: string): number {
  return Math.floor(daysBetween('2020-01-06', date) / 7);
}

export function demoFare(d: Destination, r: Route, date: string, time: string, dir: Direction, quoteDay: string): number {
  const a = airline(r.airline);
  const key = `${routeKey(r)}|${dir}|${date}|${time}`;
  const noise = 0.75 + 0.5 * (0.6 * rand(key, 'w', weekKey(quoteDay)) + 0.4 * rand(key, 'd', quoteDay));
  const promo = rand(routeKey(r), weekKey(date), 'promo', weekKey(quoteDay)) < 0.1 ? 0.6 : 1;
  const dow = (dir === 'out' ? OUT_DOW : IN_DOW)[weekday(date)];
  const price =
    d.baseFare *
    (a.lowCost ? 1 : 1.7) *
    dow *
    leadFactor(daysBetween(quoteDay, date)) *
    seasonFactor(d, date) *
    holidayFactor(date) *
    hourFactor(time) *
    noise *
    promo;
  const floor = a.lowCost ? 9.99 : 39.99;
  return Math.max(floor, Math.floor(price) + 0.99);
}

function flightNumber(r: Route, dir: Direction, slot: string): string {
  const a = airline(r.airline);
  const digits = a.lowCost ? 1000 + Math.floor(rand(routeKey(r), dir, slot, 'fn') * 8999) : 100 + Math.floor(rand(routeKey(r), dir, slot, 'fn') * 899);
  return `${r.airline}${digits}`;
}

export function demoFlights(d: Destination, r: Route, date: string, dir: Direction, quoteDay: string): Flight[] {
  if (!operates(r, date, dir)) return [];
  const duration = flightDuration(d);
  return slotsFor(r, dir).map((slot) => {
    const departure = `${date}T${slot}`;
    const tzShift = (dir === 'out' ? 1 : -1) * d.tz * 60;
    return {
      flightNumber: flightNumber(r, dir, slot),
      airline: r.airline,
      from: dir === 'out' ? r.from : r.to,
      to: dir === 'out' ? r.to : r.from,
      departure,
      arrival: addMinutes(departure, duration + tzShift),
      durationMin: duration,
      terminal: dir === 'out' ? terminalFor(r.from, r.airline) : undefined,
      fare: demoFare(d, r, date, slot, dir, quoteDay),
    };
  });
}

const cheapest = (flights: Flight[]) =>
  flights.reduce<Flight | undefined>((best, f) => (!best || f.fare < best.fare ? f : best), undefined);

export const demoProvider: FlightProvider = {
  id: 'demo',
  label: 'Demo',

  async search(mode, windows, ctx) {
    const nowLocal = localDateTime(ctx.now);
    const trips: TripOption[] = [];
    for (const d of DESTINATIONS) {
      if (d.longHaul && mode !== 'week') continue;
      for (const r of d.routes) {
        if (!ctx.origins.includes(r.from)) continue;
        for (const w of windows) {
          const outFlights = demoFlights(d, r, w.out, 'out', ctx.today).filter((f) => {
            if (mode === 'flash' || w.out === ctx.today) {
              return f.departure >= addMinutes(nowLocal, ORIGINS[r.from].bufferMin);
            }
            if (mode === 'weekend' && ctx.afterWork && weekday(w.out) === 5) return f.departure.slice(11) >= '17:00';
            return true;
          });
          const out = cheapest(outFlights);
          const back = cheapest(demoFlights(d, r, w.back, 'in', ctx.today));
          if (!out || !back) continue;
          trips.push({
            id: `${mode}:${d.code}:${r.from}:${r.airline}:${w.out}:${w.back}`,
            mode,
            destination: d.code,
            origin: r.from,
            airline: r.airline,
            outbound: out,
            inbound: back,
            fare: Math.round((out.fare + back.fare) * 100) / 100,
            source: 'demo',
          });
        }
      }
    }
    return trips;
  },

  history(trips, today, days) {
    const legs = trips.flatMap((trip) => {
      const d = DESTINATIONS.find((x) => x.code === trip.destination);
      if (!d) return [];
      const r: Route = { from: trip.origin, airline: trip.airline, to: trip.outbound.to };
      return [{ d, r, out: trip.outbound.departure, back: trip.inbound.departure }];
    });
    const series: number[] = [];
    for (let k = days - 1; k >= 0 && legs.length; k--) {
      const q = addDays(today, -k);
      const fares = legs.map(
        ({ d, r, out, back }) =>
          demoFare(d, r, out.slice(0, 10), out.slice(11), 'out', q) +
          demoFare(d, r, back.slice(0, 10), back.slice(11), 'in', q),
      );
      series.push(Math.round(Math.min(...fares) * 100) / 100);
    }
    return series;
  },
};
