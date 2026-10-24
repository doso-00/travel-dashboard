import { airline } from '../data/airlines';
import { DESTINATION_BY_CODE } from '../data/destinations';
import type { PricedTrip } from '../types';
import { formatDay, formatTime } from './dates';
import { formatEur } from './pricing';

function params(trip: PricedTrip, pax: number) {
  return {
    from: trip.origin,
    to: trip.outbound.to,
    out: trip.outbound.departure.slice(0, 10),
    back: trip.inbound.departure.slice(0, 10),
    pax,
  };
}

export function googleFlightsUrl(trip: PricedTrip, pax: number): string {
  const p = params(trip, pax);
  const q = `Voli da ${p.from} a ${p.to} il ${p.out} ritorno ${p.back} ${pax} adulti ${airline(trip.airline).name}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=it&curr=EUR`;
}

export function skyscannerUrl(trip: PricedTrip, pax: number): string {
  const p = params(trip, pax);
  const ymd = (d: string) => d.slice(2).replace(/-/g, '');
  return `https://www.skyscanner.it/trasporti/voli/${p.from.toLowerCase()}/${p.to.toLowerCase()}/${ymd(p.out)}/${ymd(p.back)}/?adultsv2=${pax}&preferdirects=true`;
}

/** Link "Acquista": sito della compagnia con tratta e date precompilate, altrimenti Google Flights. */
export function bookingUrl(trip: PricedTrip, pax: number): { url: string; direct: boolean } {
  const a = airline(trip.airline);
  if (a.bookingUrl) return { url: a.bookingUrl(params(trip, pax)), direct: true };
  return { url: googleFlightsUrl(trip, pax), direct: false };
}

const icsDate = (dt: string) => `${dt.replace(/[-:]/g, '')}00`;

export function icsFor(trip: PricedTrip): string {
  const d = DESTINATION_BY_CODE[trip.destination];
  const event = (f: PricedTrip['outbound'], summary: string) =>
    [
      'BEGIN:VEVENT',
      `UID:${f.flightNumber}-${f.departure}@partenze-milano`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${icsDate(f.departure)}`,
      `DTEND:${icsDate(f.arrival)}`,
      `SUMMARY:✈️ ${summary}`,
      `DESCRIPTION:${airline(f.airline).name} ${f.flightNumber} · ${f.from} ${formatTime(f.departure)} → ${f.to} ${formatTime(f.arrival)} (orari locali)`,
      `LOCATION:${f.from}`,
      'END:VEVENT',
    ].join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Partenze Milano//IT',
    event(trip.outbound, `${trip.outbound.flightNumber} verso ${d?.city ?? trip.destination}`),
    event(trip.inbound, `${trip.inbound.flightNumber} rientro a Milano`),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(trip: PricedTrip): void {
  const blob = new Blob([icsFor(trip)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `volo-${trip.destination.toLowerCase()}-${trip.outbound.departure.slice(0, 10)}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function shareText(trip: PricedTrip): string {
  const d = DESTINATION_BY_CODE[trip.destination];
  return (
    `✈️ ${d?.city ?? trip.destination} da ${trip.origin}: ` +
    `${formatDay(trip.outbound.departure.slice(0, 10))} → ${formatDay(trip.inbound.departure.slice(0, 10))}, ` +
    `${formatEur(trip.cost.perPax)} a persona con ${airline(trip.airline).name}`
  );
}
