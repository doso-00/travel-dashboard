// Raccoglie i prezzi reali, aggiorna lo storico e invia gli alert via ntfy.
// Gira su GitHub Actions ogni 3 ore (vedi .github/workflows/update-fares.yml):
//
//   TZ=Europe/Rome npx tsx scripts/update-fares.ts --previous prev.json --out public/data/fares.json
//
// Variabili d'ambiente opzionali: TRAVELPAYOUTS_TOKEN (attiva la seconda fonte).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DESTINATIONS, DESTINATION_BY_CODE } from '../src/data/destinations';
import { evaluateAlerts, hitKey, notify } from '../src/lib/alerts';
import { addDays, formatDay, localDate, tripWindows } from '../src/lib/dates';
import { MODES } from '../src/lib/modes';
import { average, formatEur } from '../src/lib/pricing';
import { groupByDestination, historySeries, mergeHistory, type History } from '../src/lib/search';
import type { FaresFile, SourceStatus } from '../src/providers/live';
import { createRyanairProvider } from '../src/providers/ryanair';
import { createTravelpayoutsProvider } from '../src/providers/travelpayouts';
import type { FlightProvider, SearchContext } from '../src/providers/types';
import type { Baggage, DateWindow, PriceAlert, TripMode, TripOption } from '../src/types';

const HORIZON_WEEKS = 12;
// Il fare finder restituisce un solo volo per meta: per il blocco Flash si
// chiedono più fasce orarie, così resta un'opzione valida durante la giornata.
const FLASH_SLICES = ['00:00', '10:00', '14:00', '18:00'];

interface AlertsConfig {
  ntfyTopic?: string;
  baggage?: Baggage;
  pax?: number;
  alerts: PriceAlert[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readJson<T>(path: string | undefined, fallback: T): T {
  if (!path || !existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function windowsFor(mode: TripMode, today: string): DateWindow[] {
  if (mode !== 'flash') return tripWindows(mode, today, HORIZON_WEEKS);
  // Anche domani: il file deve servire fino al prossimo aggiornamento dopo mezzanotte.
  return [...tripWindows('flash', today, 0), ...tripWindows('flash', addDays(today, 1), 0)];
}

async function collect(provider: FlightProvider, now: Date, today: string): Promise<TripOption[]> {
  const trips: TripOption[] = [];
  for (const { id: mode } of MODES) {
    const base: SearchContext = { now, today, origins: ['MXP', 'BGY', 'LIN'], afterWork: false };
    const slices = mode === 'flash' && provider.id === 'ryanair' ? FLASH_SLICES : [undefined];
    for (const outboundTimeFrom of slices) {
      const found = await provider.search(mode, windowsFor(mode, today), { ...base, outboundTimeFrom });
      console.log(`  ${provider.label} ${mode}${outboundTimeFrom ? ` dalle ${outboundTimeFrom}` : ''}: ${found.length} tariffe`);
      trips.push(...found);
    }
  }
  return trips;
}

/** Una tariffa per id, la più bassa. */
function dedupe(trips: TripOption[]): TripOption[] {
  const byId = new Map<string, TripOption>();
  for (const t of trips) if (!byId.has(t.id) || t.fare < byId.get(t.id)!.fare) byId.set(t.id, t);
  return [...byId.values()];
}

async function main() {
  const now = new Date();
  const today = localDate(now);
  const previous = readJson<Partial<FaresFile>>(arg('previous'), {});
  const config = readJson<AlertsConfig>(arg('config') ?? 'config/alerts.json', { alerts: [] });
  const out = arg('out') ?? 'public/data/fares.json';

  const providers: FlightProvider[] = [createRyanairProvider()];
  if (process.env.TRAVELPAYOUTS_TOKEN) providers.push(createTravelpayoutsProvider(process.env.TRAVELPAYOUTS_TOKEN));

  const sources: Record<string, SourceStatus> = {};
  let trips: TripOption[] = [];
  for (const provider of providers) {
    console.log(`Fonte ${provider.label}…`);
    try {
      const found = await collect(provider, now, today);
      trips.push(...found);
      sources[provider.label] = { ok: true, trips: found.length };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`  errore: ${error}`);
      sources[provider.label] = { ok: false, trips: 0, error };
    }
  }
  trips = dedupe(trips);

  const failedAll = trips.length === 0;
  if (failedAll && previous.trips?.length) {
    // Meglio dati di qualche ora fa che una dashboard vuota.
    console.warn('Nessuna tariffa nuova: tengo quelle precedenti.');
    trips = previous.trips.filter((t) => t.outbound.departure.slice(0, 10) >= today);
  }

  // Storico: miglior tariffa del giorno per meta e modalità (bagaglio escluso).
  const history: History = previous.history ?? {};
  const byMode = (mode: TripMode) => trips.filter((t) => t.mode === mode);
  if (!failedAll) {
    for (const { id } of MODES) mergeHistory(history, groupByDestination(byMode(id), { baggage: 'personal', pax: 1, includeTransfer: false }, {}), today);
  }

  // Alert lato server: arrivano sul telefono anche a dashboard chiusa.
  const notified = new Set(previous.notified ?? []);
  const prefs = { baggage: config.baggage ?? 'personal', pax: config.pax ?? 1, includeTransfer: false };
  const results = MODES.flatMap(({ id }) => {
    const modeTrips = byMode(id);
    const averages: Record<string, number | null> = {};
    for (const t of modeTrips) {
      const series = historySeries(history, id, t.destination);
      averages[t.destination] = series.length >= 3 ? average(series) : null;
    }
    return groupByDestination(modeTrips, prefs, averages);
  });
  const hits = evaluateAlerts(config.alerts, results).filter((h) => !notified.has(hitKey(h)));
  for (const h of hits) {
    const t = h.result.best;
    const title = `✈️ ${h.result.destination.city}: ${formatEur(Math.round(t.cost.perPax))}`;
    const body = `${formatDay(t.outbound.departure.slice(0, 10))} → ${formatDay(t.inbound.departure.slice(0, 10))} da ${t.origin} · ${h.reason}`;
    console.log(`Alert: ${title} — ${body}`);
    if (config.ntfyTopic) await notify(title, body, config.ntfyTopic);
    notified.add(hitKey(h));
  }

  const catalog = new Set(DESTINATIONS.map((d) => d.code));
  const extra = [...new Set(trips.map((t) => t.destination))].filter((c) => !catalog.has(c)).map((c) => DESTINATION_BY_CODE[c]).filter(Boolean);

  const file: FaresFile = {
    version: 1,
    generatedAt: now.toISOString(),
    sources,
    trips,
    destinations: extra,
    history,
    notified: [...notified].slice(-300),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(file));
  console.log(`Scritte ${trips.length} tariffe, ${extra.length} mete extra, ${hits.length} alert → ${out}`);
}

main();
