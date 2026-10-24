import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertsDrawer } from './components/AlertsDrawer';
import { Controls, type SortKey } from './components/Controls';
import { ModeBlock } from './components/ModeBlock';
import { TripDetail } from './components/TripDetail';
import { holidayName } from './data/holidays';
import { usePersistent } from './hooks/usePersistent';
import { evaluateAlerts, hitKey, notify } from './lib/alerts';
import { addDays, formatDay, localDate, weekday } from './lib/dates';
import { MODES } from './lib/modes';
import { formatEur } from './lib/pricing';
import { applyFilters, computeAverages, groupByDestination, recordSnapshots, searchMode } from './lib/search';
import { load, save } from './lib/storage';
import { demoProvider } from './providers/demo';
import { liveProvider, resetLiveCache } from './providers/live';
import type { FlightProvider } from './providers/types';
import type { DestinationResult, PriceAlert, Prefs, PricedTrip, TripMode, TripOption } from './types';

const DEFAULT_PREFS: Prefs = {
  origins: ['MXP', 'BGY', 'LIN'],
  baggage: 'personal',
  pax: 1,
  includeTransfer: false,
  horizonWeeks: 8,
  maxBudget: null,
  tags: [],
  afterWork: false,
  provider: 'live',
};

const PROVIDERS: Record<Prefs['provider'], FlightProvider> = { demo: demoProvider, live: liveProvider };
const RECHECK_MS = 30 * 60_000;

interface ModeData {
  trips: TripOption[];
  averages: Record<string, number | null>;
  provider: FlightProvider;
}

const nextTick = () => new Promise((r) => setTimeout(r, 0));

function sortResults(results: DestinationResult[], sort: SortKey) {
  const copy = [...results];
  if (sort === 'deal') copy.sort((a, b) => (b.dealPct ?? -999) - (a.dealPct ?? -999));
  if (sort === 'date') copy.sort((a, b) => a.best.outbound.departure.localeCompare(b.best.outbound.departure));
  return copy;
}

/** Prossime festività: le più interessanti cadono vicino al weekend (ponti). */
function upcomingHolidays(today: string, days = 120) {
  const list: { date: string; name: string; bridge: boolean }[] = [];
  for (let i = 0; i < days && list.length < 5; i++) {
    const date = addDays(today, i);
    const name = holidayName(date);
    if (name) list.push({ date, name, bridge: [1, 2, 4, 5].includes(weekday(date)) });
  }
  return list;
}

export default function App() {
  const [prefs, setPrefs] = usePersistent<Prefs>('td.prefs', DEFAULT_PREFS);
  const mergedPrefs = useMemo(() => {
    const merged = { ...DEFAULT_PREFS, ...prefs };
    // Preferenze salvate da versioni precedenti (es. provider "ryanair").
    if (!(merged.provider in PROVIDERS)) merged.provider = DEFAULT_PREFS.provider;
    return merged;
  }, [prefs]);
  const [alerts, setAlerts] = usePersistent<PriceAlert[]>('td.alerts', []);
  const [ntfyTopic, setNtfyTopic] = usePersistent('td.ntfy', '');
  const [sort, setSort] = usePersistent<SortKey>('td.sort', 'price');
  const [now, setNow] = useState(() => new Date());
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Partial<Record<TripMode, ModeData>>>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ mode: TripMode; destination: string; tripId: string } | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [tab, setTab] = usePersistent<TripMode>('td.tab', 'weekend');
  const today = localDate(now);
  const searchedAt = useRef(now);

  const update = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...DEFAULT_PREFS, ...p, ...patch }));

  // Orologio del tabellone.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Ricontrolla prezzi e alert ogni 30 minuti mentre la dashboard è aperta.
  useEffect(() => {
    const id = setInterval(() => setRefresh((n) => n + 1), RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  // Ricerca: un blocco alla volta, così i primi risultati compaiono subito.
  const { origins, horizonWeeks, afterWork, provider: providerId } = mergedPrefs;
  useEffect(() => {
    let cancelled = false;
    const searchNow = new Date();
    const searchDay = localDate(searchNow);
    searchedAt.current = searchNow;
    resetLiveCache();
    setData({});
    setProviderError(null);
    (async () => {
      for (const { id: mode } of MODES) {
        await nextTick();
        if (cancelled) return;
        let provider = PROVIDERS[providerId];
        let trips: TripOption[];
        try {
          trips = await searchMode(mode, provider, { origins, horizonWeeks, afterWork }, searchNow, searchDay);
        } catch (e) {
          setProviderError(e instanceof Error ? e.message : String(e));
          provider = demoProvider;
          trips = await searchMode(mode, provider, { origins, horizonWeeks, afterWork }, searchNow, searchDay);
        }
        if (cancelled) return;
        const averages = computeAverages(trips, provider, searchDay);
        setData((prev) => ({ ...prev, [mode]: { trips, averages, provider } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origins.join(), horizonWeeks, afterWork, providerId, refresh]);

  const grouped = useMemo(() => {
    const out: Partial<Record<TripMode, DestinationResult[]>> = {};
    for (const { id } of MODES) {
      const d = data[id];
      if (d) out[id] = groupByDestination(d.trips, mergedPrefs, d.averages);
    }
    return out;
  }, [data, mergedPrefs]);

  const allResults = useMemo(() => MODES.flatMap((m) => grouped[m.id] ?? []), [grouped]);
  const ready = MODES.every((m) => data[m.id]);
  const hits = useMemo(() => (ready ? evaluateAlerts(alerts, allResults) : []), [ready, alerts, allResults]);

  // Storico locale + notifiche per i nuovi alert scattati.
  useEffect(() => {
    if (!ready) return;
    recordSnapshots(allResults, localDate(searchedAt.current));
    const notified = new Set(load<string[]>('td.notified', []));
    const fresh = hits.filter((h) => !notified.has(hitKey(h)));
    for (const h of fresh) {
      const t = h.result.best;
      notify(
        `✈️ ${h.result.destination.city}: ${formatEur(Math.round(t.cost.perPax))}`,
        `${formatDay(t.outbound.departure.slice(0, 10))} → ${formatDay(t.inbound.departure.slice(0, 10))} da ${t.origin} · ${h.reason}`,
        ntfyTopic || undefined,
      );
      notified.add(hitKey(h));
    }
    if (fresh.length) save('td.notified', [...notified].slice(-200));
  }, [ready, hits]);

  const isWatched = useCallback((code: string) => alerts.some((a) => a.destination === code), [alerts]);

  const toggleWatch = (r: DestinationResult) => {
    if (isWatched(r.destination.code)) {
      setAlerts((list) => list.filter((a) => a.destination !== r.destination.code));
    } else {
      setAlerts((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          destination: r.destination.code,
          mode: 'any',
          maxPrice: Math.max(10, Math.floor(r.best.cost.perPax * 0.85)),
          dropPct: 20,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const open = (r: DestinationResult) => setSelected({ mode: r.mode, destination: r.destination.code, tripId: r.best.id });
  const selectedResult = selected ? grouped[selected.mode]?.find((r) => r.destination.code === selected.destination) : undefined;
  const selectedTrip: PricedTrip | undefined =
    selectedResult && (selectedResult.options.find((o) => o.id === selected?.tripId) ?? selectedResult.best);

  const surprise = () => {
    const pool = allResults.filter((r) => applyFilters([r], mergedPrefs).length && (r.dealPct ?? 0) >= 0);
    if (pool.length) open(pool[Math.floor(Math.random() * pool.length)]);
  };

  const holidays = upcomingHolidays(today);
  const clock = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="app">
      <header className="board">
        <div className="board-brand">
          <span className="logo">✈</span>
          <div>
            <h1>Partenze · Milano</h1>
            <p>Malpensa · Bergamo · Linate — le mete più economiche, ordinate per prezzo</p>
          </div>
        </div>
        <div className="board-right">
          <div className="flap" aria-label={`Ora ${clock}`}>
            {clock.split('').map((c, i) => (
              <span key={i} className={c === ':' ? 'colon' : 'cell'}>
                {c}
              </span>
            ))}
          </div>
          <span className="board-date">{formatDay(today)}</span>
          <div className="board-actions">
            <button className="btn ghost" onClick={surprise} disabled={!ready} title="Una meta a caso tra le più convenienti">
              🎲 <span className="label">Sorprendimi</span>
            </button>
            <button className="btn ghost bell" onClick={() => setAlertsOpen(true)}>
              🔔 <span className="label">Alert</span>
              {hits.length > 0 && <span className="count">{hits.length}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        <div className="status small">
          <span className={`dot ${providerError ? 'warn' : providerId === 'demo' ? 'demo' : 'live'}`} />
          <span className="muted">
            {providerError
              ? `Prezzi reali non disponibili (${providerError}): dati demo`
              : providerId === 'demo'
                ? 'Dati demo: prezzi simulati, cambia fonte in Filtri'
                : (liveProvider.describe?.() ?? 'Carico i prezzi reali…')}
          </span>
          <button className="icon-btn small" onClick={() => setRefresh((n) => n + 1)} aria-label="Aggiorna" title="Aggiorna">
            ↻
          </button>
        </div>

        <Controls prefs={mergedPrefs} sort={sort} onChange={update} onSort={setSort} />

        <nav className="tabs" role="tablist" aria-label="Tipo di viaggio">
          {MODES.map((m) => {
            const list = applyFilters(grouped[m.id] ?? [], mergedPrefs);
            return (
              <button key={m.id} role="tab" aria-selected={tab === m.id} className={tab === m.id ? 'on' : ''} onClick={() => setTab(m.id)}>
                <span className="tab-title">
                  {m.icon} {m.title}
                </span>
                <span className="tab-price">{data[m.id] ? (list[0] ? `da ${formatEur(Math.round(list[0].best.cost.perPax))}` : '—') : '…'}</span>
              </button>
            );
          })}
        </nav>

        {tab === 'long-weekend' && holidays.length > 0 && (
          <div className="ponti" aria-label="Prossime festività">
            <span className="ponti-title">🎉 Ponti in vista</span>
            {holidays.map((h) => (
              <span key={h.date} className={`ponte ${h.bridge ? 'bridge' : ''}`} title={h.bridge ? 'Vicino al weekend: perfetto per un weekend lungo' : ''}>
                <b>{formatDay(h.date)}</b> {h.name}
              </span>
            ))}
          </div>
        )}

        <ModeBlock
          key={tab}
          mode={tab}
          now={now}
          prefs={mergedPrefs}
          status={data[tab] ? 'ready' : 'loading'}
          results={sortResults(applyFilters(grouped[tab] ?? [], mergedPrefs), sort)}
          isWatched={isWatched}
          onOpen={open}
          onWatch={toggleWatch}
        />

        <footer className="foot small muted">
          Prezzi a persona andata e ritorno, voli diretti. Medie calcolate sugli ultimi 60 giorni. Gli orari sono locali.
        </footer>
      </main>

      {selectedResult && selectedTrip && (
        <TripDetail
          result={selectedResult}
          trip={selectedTrip}
          prefs={mergedPrefs}
          provider={data[selectedResult.mode]?.provider ?? demoProvider}
          today={localDate(searchedAt.current)}
          watched={isWatched(selectedResult.destination.code)}
          onClose={() => setSelected(null)}
          onSelect={(t) => setSelected({ mode: t.mode, destination: t.destination, tripId: t.id })}
          onBaggage={(baggage) => update({ baggage })}
          onWatch={() => toggleWatch(selectedResult)}
        />
      )}

      {alertsOpen && (
        <AlertsDrawer
          alerts={alerts}
          hits={hits}
          results={allResults}
          ntfyTopic={ntfyTopic}
          onNtfyTopic={setNtfyTopic}
          onAdd={(a) => setAlerts((list) => [...list, a])}
          onRemove={(id) => setAlerts((list) => list.filter((a) => a.id !== id))}
          onOpen={(r) => {
            setAlertsOpen(false);
            open(r);
          }}
          onClose={() => setAlertsOpen(false)}
        />
      )}
    </div>
  );
}
