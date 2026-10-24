import { airline } from '../data/airlines';
import { ORIGINS } from '../data/airports';
import { DESTINATION_BY_CODE } from '../data/destinations';
import type { Baggage, CostBreakdown, Prefs, TripOption } from '../types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Costo per tratta di un bagaglio, scalato sulla distanza (le low cost fanno così). */
function scaledFee([min, max]: [number, number], distanceKm: number): number {
  const t = Math.min(1, distanceKm / 3000);
  return Math.round(min + (max - min) * t);
}

export interface BaggageQuote {
  option: Baggage;
  label: string;
  detail: string;
  /** Supplemento A/R per passeggero. */
  extra: number;
}

export function baggageQuotes(airlineCode: string, destinationCode: string): BaggageQuote[] {
  const a = airline(airlineCode);
  const km = DESTINATION_BY_CODE[destinationCode]?.distanceKm ?? 1500;
  const cabin = a.cabinIncluded ? 0 : scaledFee(a.cabinFee, km) * 2;
  const checked = scaledFee(a.checkedFee, km) * 2;
  return [
    { option: 'personal', label: 'Solo zaino', detail: a.personalItem, extra: 0 },
    {
      option: 'cabin',
      label: 'Trolley in cabina',
      detail: a.cabinIncluded ? 'Incluso nella tariffa' : 'Priority + trolley 10 kg',
      extra: cabin,
    },
    {
      option: 'checked',
      label: `Stiva ${a.checkedKg} kg`,
      detail: checked === 0 ? 'Incluso nella tariffa' : `Bagaglio da stiva ${a.checkedKg} kg`,
      extra: checked,
    },
  ];
}

export function tripCost(
  trip: Pick<TripOption, 'airline' | 'destination' | 'origin' | 'fare'>,
  prefs: Pick<Prefs, 'baggage' | 'pax' | 'includeTransfer'>,
): CostBreakdown {
  const baggage = baggageQuotes(trip.airline, trip.destination).find((q) => q.option === prefs.baggage)!.extra;
  const transfer = prefs.includeTransfer ? ORIGINS[trip.origin].transfer.priceOneWay * 2 : 0;
  const perPax = round2(trip.fare + baggage + transfer);
  return { fare: trip.fare, baggage, transfer, perPax, total: round2(perPax * prefs.pax) };
}

/** Sconto percentuale rispetto alla media (positivo = più economico della media). */
export function dealPct(price: number, avg: number | null): number | null {
  if (!avg) return null;
  return Math.round(((avg - price) / avg) * 100);
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return round2(values.reduce((s, v) => s + v, 0) / values.length);
}

export function formatEur(n: number, decimals = n % 1 === 0 ? 0 : 2): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}
