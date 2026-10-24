import { DESTINATION_BY_CODE } from '../data/destinations';
import type { FlightProvider } from '../providers/types';
import type { DestinationResult, Prefs, PricedTrip, TripMode, TripOption } from '../types';
import { tripWindows } from './dates';
import { average, dealPct, tripCost } from './pricing';
import { load, save } from './storage';

const HISTORY_DAYS = 60;
const SNAPSHOT_KEY = 'td.snapshots';

type Snapshots = Record<string, Record<string, number>>;

/**
 * Registra la miglior tariffa di oggi per meta e modalità: con i dati live è
 * così che si costruisce la media del periodo, giorno dopo giorno.
 */
export function recordSnapshots(results: DestinationResult[], today: string): Snapshots {
  const snaps = load<Snapshots>(SNAPSHOT_KEY, {});
  const cutoff = new Date(Date.parse(today) - 120 * 86_400_000).toISOString().slice(0, 10);
  for (const r of results) {
    const key = `${r.mode}:${r.destination.code}`;
    const series = (snaps[key] ??= {});
    series[today] = Math.min(series[today] ?? Infinity, r.best.fare);
    for (const day of Object.keys(series)) if (day < cutoff) delete series[day];
  }
  save(SNAPSHOT_KEY, snaps);
  return snaps;
}

export function snapshotSeries(mode: TripMode, destination: string): number[] {
  const series = load<Snapshots>(SNAPSHOT_KEY, {})[`${mode}:${destination}`] ?? {};
  return Object.keys(series).sort().map((d) => series[d]);
}

/** Una sola opzione per coppia di date (la prima, cioè la più conveniente nell'ordine dato). */
function uniqueByDates<T extends TripOption>(sorted: T[]): T[] {
  const seen = new Set<string>();
  return sorted.filter((o) => {
    const k = `${o.outbound.departure.slice(0, 10)}>${o.inbound.departure.slice(0, 10)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function byDestination<T extends TripOption>(trips: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const t of trips) map.set(t.destination, [...(map.get(t.destination) ?? []), t]);
  return map;
}

/** Storico giornaliero del miglior prezzo per una meta, dalle sue opzioni di viaggio. */
export function destinationHistory(options: TripOption[], provider: FlightProvider, today: string): number[] {
  if (!options.length) return [];
  if (!provider.history) return snapshotSeries(options[0].mode, options[0].destination);
  // Le prime opzioni per tariffa bastano: sono quelle che vincono ogni giorno.
  const top = uniqueByDates([...options].sort((a, b) => a.fare - b.fare)).slice(0, 8);
  return provider.history(top, today, HISTORY_DAYS);
}

/**
 * Media del miglior prezzo per meta nel periodo osservato. Non dipende da
 * bagaglio e passeggeri, quindi si calcola una volta per ricerca.
 */
export function computeAverages(trips: TripOption[], provider: FlightProvider, today: string): Record<string, number | null> {
  const averages: Record<string, number | null> = {};
  for (const [code, options] of byDestination(trips)) {
    const history = destinationHistory(options, provider, today);
    averages[code] = history.length >= 3 ? average(history) : null;
  }
  return averages;
}

/** Raggruppa le opzioni per meta, ordina per costo totale e calcola lo sconto sulla media. */
export function groupByDestination(
  trips: TripOption[],
  prefs: Pick<Prefs, 'baggage' | 'pax' | 'includeTransfer'>,
  averages: Record<string, number | null>,
): DestinationResult[] {
  const priced = trips.map((t): PricedTrip => ({ ...t, cost: tripCost(t, prefs) }));
  const results: DestinationResult[] = [];
  for (const [code, options] of byDestination(priced)) {
    const destination = DESTINATION_BY_CODE[code];
    if (!destination) continue;
    options.sort((a, b) => a.cost.total - b.cost.total || a.outbound.departure.localeCompare(b.outbound.departure));
    const unique = uniqueByDates(options);
    const best = unique[0];
    const avgFare = averages[code] ?? null;
    results.push({ destination, mode: best.mode, best, options: unique, avgFare, dealPct: dealPct(best.fare, avgFare) });
  }
  return results.sort((a, b) => a.best.cost.total - b.best.cost.total);
}

export async function searchMode(
  mode: TripMode,
  provider: FlightProvider,
  prefs: Pick<Prefs, 'origins' | 'horizonWeeks' | 'afterWork'>,
  now: Date,
  today: string,
): Promise<TripOption[]> {
  const windows = tripWindows(mode, today, prefs.horizonWeeks);
  return provider.search(mode, windows, { now, today, origins: prefs.origins, afterWork: prefs.afterWork });
}

/** Filtri "leggeri" applicati ai risultati già calcolati. */
export function applyFilters(results: DestinationResult[], prefs: Pick<Prefs, 'maxBudget' | 'tags'>): DestinationResult[] {
  return results.filter(
    (r) =>
      (prefs.maxBudget == null || r.best.cost.perPax <= prefs.maxBudget) &&
      (!prefs.tags.length || prefs.tags.some((t) => r.destination.tags.includes(t))),
  );
}
