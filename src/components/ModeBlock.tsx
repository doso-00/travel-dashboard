import { useState } from 'react';
import { ORIGINS } from '../data/airports';
import { addMinutes, formatTime, localDateTime } from '../lib/dates';
import { MODE_BY_ID } from '../lib/modes';
import { formatEur } from '../lib/pricing';
import type { DestinationResult, Prefs, TripMode } from '../types';
import { TripCard } from './TripCard';

interface Props {
  mode: TripMode;
  results: DestinationResult[];
  status: 'loading' | 'ready';
  prefs: Prefs;
  query: string;
  now: Date;
  isWatched: (destination: string) => boolean;
  onOpen: (r: DestinationResult) => void;
  onWatch: (r: DestinationResult) => void;
}

const PAGE = 8;

export function ModeBlock({ mode, results, status, prefs, query, now, isWatched, onOpen, onWatch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const meta = MODE_BY_ID[mode];
  const visible = expanded ? results : results.slice(0, PAGE);
  const earliest = Math.min(...prefs.origins.map((o) => ORIGINS[o].bufferMin));
  const rule =
    mode === 'flash' ? `Decollo oggi dopo le ${formatTime(addMinutes(localDateTime(now), earliest))} · rientro dopo 1-2 notti` : meta.rule;

  return (
    <section className={`block block-${mode}`} id={mode}>
      <header className="block-head">
        <div>
          <h2>
            <span className="block-icon">{meta.icon}</span> {meta.title}
          </h2>
          <p className="muted">{rule}</p>
        </div>
        {status === 'ready' && results.length > 0 && (
          <div className="block-summary">
            <span className="small muted">{results.length} mete da</span>
            <strong>{formatEur(Math.round(results[0].best.cost.perPax))}</strong>
          </div>
        )}
      </header>

      {status === 'loading' ? (
        <div className="grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="ticket skeleton" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="empty">
          {query
            ? `Nessun volo diretto per "${query}" in questo blocco: prova gli altri tab o un altro aeroporto.`
            : mode === 'flash'
              ? 'Nessun volo utile oggi con questi filtri: guarda il blocco Weekend o allarga il budget.'
              : 'Nessuna meta con questi filtri. Prova ad allargare budget, mood o aeroporti.'}
        </p>
      ) : (
        <>
          <div className="grid">
            {visible.map((r, i) => (
              <TripCard
                key={r.destination.code}
                result={r}
                rank={i + 1}
                pax={prefs.pax}
                watched={isWatched(r.destination.code)}
                onOpen={() => onOpen(r)}
                onWatch={() => onWatch(r)}
              />
            ))}
          </div>
          {results.length > PAGE && (
            <button className="btn more" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Mostra meno' : `Mostra tutte le ${results.length} mete`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
