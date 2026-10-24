import { ORIGINS } from '../data/airports';
import { registerDestination } from '../data/destinations';
import { addMinutes, localDateTime, weekday } from '../lib/dates';
import { historySeries, type History } from '../lib/search';
import type { Destination, TripOption } from '../types';
import type { FlightProvider } from './types';

// Prezzi reali raccolti ogni 3 ore da GitHub Actions (scripts/update-fares.ts)
// e pubblicati accanto alla dashboard in data/fares.json: il browser legge un
// file statico, quindi nessun problema di CORS e nessun server da pagare.

export interface SourceStatus {
  ok: boolean;
  trips: number;
  error?: string;
}

export interface FaresFile {
  version: 1;
  generatedAt: string;
  /** Ultimo aggiornamento del blocco Flash (gira ogni ora). */
  flashUpdatedAt?: string;
  sources: Record<string, SourceStatus>;
  trips: TripOption[];
  /** Mete trovate dalle fonti live che non sono nel catalogo. */
  destinations: Destination[];
  history: History;
  /** Alert già notificati via ntfy, per non ripeterli. */
  notified: string[];
}

const FARES_URLS = [
  './data/fares.json',
  // Riserva se la pagina è servita da un posto senza il file (es. npm run dev).
  'https://raw.githubusercontent.com/doso-00/travel-dashboard/gh-pages/data/fares.json',
];

let cache: Promise<FaresFile> | null = null;
let loaded: FaresFile | null = null;

async function loadFares(): Promise<FaresFile> {
  let lastError: unknown;
  for (const url of FARES_URLS) {
    try {
      const res = await fetch(`${url}?t=${Math.floor(Date.now() / 600_000)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FaresFile;
      if (data.version !== 1 || !Array.isArray(data.trips)) throw new Error('formato non valido');
      data.destinations.forEach(registerDestination);
      return data;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`prezzi reali non disponibili (${lastError instanceof Error ? lastError.message : lastError})`);
}

export const liveProvider: FlightProvider = {
  id: 'live',
  label: 'Prezzi reali',

  async search(mode, windows, ctx) {
    cache ??= loadFares().catch((e) => {
      cache = null;
      throw e;
    });
    loaded = await cache;
    if (!loaded.trips.length) throw new Error('nessuna tariffa nell’ultimo aggiornamento');
    const pairs = new Set(windows.map((w) => `${w.out}>${w.back}`));
    const nowLocal = localDateTime(ctx.now);
    return loaded.trips.filter((t) => {
      const out = t.outbound.departure.slice(0, 10);
      const back = t.inbound.departure.slice(0, 10);
      if (t.mode !== mode || !ctx.origins.includes(t.origin) || !pairs.has(`${out}>${back}`)) return false;
      if (out === ctx.today) return t.outbound.departure >= addMinutes(nowLocal, ORIGINS[t.origin].bufferMin);
      if (mode === 'weekend' && ctx.afterWork && weekday(out) === 5) return t.outbound.departure.slice(11) >= '17:00';
      return true;
    });
  },

  history(trips) {
    if (!loaded || !trips.length) return [];
    return historySeries(loaded.history, trips[0].mode, trips[0].destination);
  },

  describe() {
    if (!loaded) return null;
    const time = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const flash = loaded.flashUpdatedAt ? ` · Flash alle ${time(loaded.flashUpdatedAt)}` : '';
    const failed = Object.entries(loaded.sources).filter(([, s]) => !s.ok).map(([name]) => name);
    return `Aggiornati alle ${time(loaded.generatedAt)}${flash}${failed.length ? ` · non disponibile: ${failed.join(', ')}` : ''}`;
  },
};

/** Per i test e per forzare il ricaricamento con "Aggiorna". */
export function resetLiveCache(): void {
  cache = null;
}
