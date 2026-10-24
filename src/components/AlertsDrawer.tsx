import { useMemo, useState } from 'react';
import { DESTINATIONS, DESTINATION_BY_CODE } from '../data/destinations';
import { ANY_DESTINATION, notify, requestNotificationPermission } from '../lib/alerts';
import { MODES, MODE_BY_ID } from '../lib/modes';
import { formatEur } from '../lib/pricing';
import type { AlertHit, DestinationResult, PriceAlert, TripMode } from '../types';
import { DealBadge } from './DealBadge';
import { DestinationPicker, type DestinationOption } from './DestinationPicker';

interface Props {
  alerts: PriceAlert[];
  hits: AlertHit[];
  results: DestinationResult[];
  ntfyTopic: string;
  onNtfyTopic: (t: string) => void;
  onAdd: (a: PriceAlert) => void;
  onRemove: (id: string) => void;
  onOpen: (r: DestinationResult) => void;
  onClose: () => void;
}

export function AlertsDrawer(props: Props) {
  const { alerts, hits, results, ntfyTopic, onNtfyTopic, onAdd, onRemove, onOpen, onClose } = props;
  const [dest, setDest] = useState(ANY_DESTINATION);
  const [mode, setMode] = useState<TripMode | 'any'>('any');
  const [maxPrice, setMaxPrice] = useState('');
  const [dropPct, setDropPct] = useState('20');
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  // Catalogo + mete scoperte dai prezzi reali, con il prezzo più basso del momento.
  const destinationOptions = useMemo(() => {
    const byCode = new Map<string, DestinationOption>(DESTINATIONS.map((d) => [d.code, { destination: d }]));
    for (const r of results) {
      const current = byCode.get(r.destination.code);
      const price = Math.min(current?.price ?? Infinity, r.best.cost.perPax);
      byCode.set(r.destination.code, { destination: r.destination, price });
    }
    return [...byCode.values()].sort((a, b) => a.destination.city.localeCompare(b.destination.city, 'it'));
  }, [results]);

  const bestFor = (a: PriceAlert) =>
    results
      .filter((r) => (a.destination === ANY_DESTINATION || r.destination.code === a.destination) && (a.mode === 'any' || r.mode === a.mode))
      .sort((x, y) => x.best.cost.perPax - y.best.cost.perPax)[0];

  const add = () => {
    const price = maxPrice ? Number(maxPrice) : null;
    const pct = dropPct ? Number(dropPct) : null;
    if (price == null && pct == null) return;
    onAdd({ id: crypto.randomUUID(), destination: dest, mode, maxPrice: price, dropPct: pct, createdAt: new Date().toISOString() });
    setMaxPrice('');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal aria-label="Watchlist e alert" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h2>🔔 Watchlist & alert</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>

        <section className="panel">
          <h4>Nuovo alert</h4>
          <div className="form-grid">
            <label className="span-2">
              Meta
              <DestinationPicker value={dest} options={destinationOptions} onChange={setDest} />
            </label>
            <label>
              Quando
              <select value={mode} onChange={(e) => setMode(e.target.value as TripMode | 'any')}>
                <option value="any">Qualsiasi</option>
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prezzo max €/persona
              <input type="number" min={1} inputMode="numeric" placeholder="es. 60" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </label>
            <label>
              oppure sconto ≥ % vs media
              <input type="number" min={1} max={90} inputMode="numeric" value={dropPct} onChange={(e) => setDropPct(e.target.value)} />
            </label>
          </div>
          <button className="btn primary" onClick={add}>
            Aggiungi alert
          </button>
          <p className="small muted">
            Scatta quando il prezzo (bagaglio scelto incluso) scende sotto la soglia o sotto la media degli ultimi 60 giorni della
            percentuale indicata. Gli alert creati qui si controllano con l'app aperta (ogni 30 minuti); quelli in{' '}
            <code>config/alerts.json</code> arrivano su ntfy anche ad app chiusa.
          </p>
        </section>

        <section className="panel">
          <h4>Le tue mete ({alerts.length})</h4>
          {alerts.length === 0 && <p className="small muted">Nessun alert: tocca ♡ su una meta o creane uno qui sopra.</p>}
          <ul className="alert-list">
            {alerts.map((a) => {
              const d = DESTINATION_BY_CODE[a.destination];
              const best = bestFor(a);
              const hit = hits.find((h) => h.alert.id === a.id);
              return (
                <li key={a.id} className={hit ? 'hit' : ''}>
                  <div>
                    <b>
                      {a.destination === ANY_DESTINATION ? '🌍 Qualsiasi meta' : `${d?.flag ?? ''} ${d?.city ?? a.destination}`}
                    </b>{' '}
                    <span className="small muted">
                      {a.mode === 'any' ? 'qualsiasi' : MODE_BY_ID[a.mode].title}
                      {a.maxPrice != null && ` · ≤ ${formatEur(a.maxPrice)}`}
                      {a.dropPct != null && ` · -${a.dropPct}% vs media`}
                    </span>
                    {best ? (
                      <button className="link" onClick={() => onOpen(best)}>
                        Ora {formatEur(Math.round(best.best.cost.perPax))} <DealBadge pct={best.dealPct} />
                      </button>
                    ) : (
                      <span className="small muted"> · nessun volo con i filtri attuali</span>
                    )}
                    {hit && <p className="small hit-reason">✅ {hit.reason}</p>}
                  </div>
                  <button className="icon-btn" onClick={() => onRemove(a.id)} aria-label="Rimuovi alert">
                    🗑
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h4>Notifiche</h4>
          <p className="small">
            Browser:{' '}
            <b>{permission === 'granted' ? 'attive' : permission === 'denied' ? 'bloccate' : permission === 'unsupported' ? 'non supportate' : 'da attivare'}</b>
          </p>
          {permission === 'default' && (
            <button className="btn" onClick={async () => setPermission(await requestNotificationPermission())}>
              Attiva notifiche del browser
            </button>
          )}
          <label className="stack">
            <span className="small">
              Push sul telefono con{' '}
              <a href="https://ntfy.sh" target="_blank" rel="noreferrer">
                ntfy
              </a>
              : installa l'app, iscriviti a un topic segreto e scrivilo qui.
            </span>
            <input placeholder="es. voli-milano-8f3k2" value={ntfyTopic} onChange={(e) => onNtfyTopic(e.target.value.trim())} />
          </label>
          <button className="btn" onClick={() => notify('✈️ Test Partenze Milano', 'Le notifiche funzionano!', ntfyTopic || undefined)}>
            Invia notifica di prova
          </button>
        </section>
      </aside>
    </div>
  );
}
