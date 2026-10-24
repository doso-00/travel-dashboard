import { airline } from '../data/airlines';
import { holidaysBetween } from '../data/holidays';
import { formatDay, formatTime } from '../lib/dates';
import { formatEur } from '../lib/pricing';
import type { DestinationResult } from '../types';
import { DealBadge } from './DealBadge';

interface Props {
  result: DestinationResult;
  rank: number;
  pax: number;
  watched: boolean;
  onOpen: () => void;
  onWatch: () => void;
}

export function TripCard({ result, rank, pax, watched, onOpen, onWatch }: Props) {
  const { destination: d, best } = result;
  const out = best.outbound.departure.slice(0, 10);
  const back = best.inbound.departure.slice(0, 10);
  const nights = Math.round((Date.parse(back) - Date.parse(out)) / 86_400_000);
  const holidays = holidaysBetween(out, back);
  const a = airline(best.airline);

  return (
    <article className="ticket" onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className="ticket-main">
        <header className="ticket-head">
          <span className="rank">{String(rank).padStart(2, '0')}</span>
          <div className="ticket-city">
            <h3>
              <span className="flag">{d.flag}</span> {d.city}
            </h3>
            <p className="muted small">{d.country}</p>
          </div>
          <button
            className={`icon-btn watch ${watched ? 'on' : ''}`}
            aria-label={watched ? 'Già nella watchlist' : 'Aggiungi alla watchlist'}
            title={watched ? 'Nella watchlist' : 'Avvisami se scende'}
            onClick={(e) => {
              e.stopPropagation();
              onWatch();
            }}
          >
            {watched ? '♥' : '♡'}
          </button>
        </header>

        <div className="route">
          <span className="iata">{best.origin}</span>
          <span className="route-line" aria-hidden>
            <i>✈</i>
          </span>
          <span className="iata">{best.outbound.to}</span>
        </div>

        <p className="dates">
          {formatDay(out)} → {formatDay(back)} <span className="muted">· {nights} {nights === 1 ? 'notte' : 'notti'}</span>
        </p>
        <p className="small muted flight-line">
          <span className="airline-dot" style={{ background: a.color }} /> {a.name} · {formatTime(best.outbound.departure)}–
          {formatTime(best.outbound.arrival)} · rientro {formatTime(best.inbound.departure)}
        </p>
        <div className="badges">
          <DealBadge pct={result.dealPct} />
          {holidays.map((h) => (
            <span key={h} className="badge holiday">
              🎉 {h}
            </span>
          ))}
          {result.options.length > 1 && <span className="badge ghost">+{result.options.length - 1} date</span>}
        </div>
      </div>

      <div className="ticket-stub">
        <span className="stub-label">a persona</span>
        <strong className="price">{formatEur(Math.round(best.cost.perPax))}</strong>
        {pax > 1 && <span className="small">{formatEur(Math.round(best.cost.total))} in {pax}</span>}
        <span className="stub-cta">Dettagli →</span>
      </div>
    </article>
  );
}
