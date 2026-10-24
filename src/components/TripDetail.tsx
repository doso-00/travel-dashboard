import { useEffect, useMemo, type CSSProperties } from 'react';
import { airline } from '../data/airlines';
import { ORIGINS } from '../data/airports';
import { holidaysBetween } from '../data/holidays';
import { formatDay, formatDuration, formatTime, minutesBetween, monthIndex } from '../lib/dates';
import { bookingUrl, downloadIcs, googleFlightsUrl, shareText, skyscannerUrl } from '../lib/links';
import { MODE_BY_ID } from '../lib/modes';
import { baggageQuotes, formatEur } from '../lib/pricing';
import { destinationHistory } from '../lib/search';
import type { FlightProvider } from '../providers/types';
import type { Baggage, DestinationResult, Flight, Prefs, PricedTrip } from '../types';
import { DealBadge } from './DealBadge';
import { Sparkline } from './Sparkline';

interface Props {
  result: DestinationResult;
  trip: PricedTrip;
  prefs: Prefs;
  provider: FlightProvider;
  today: string;
  watched: boolean;
  onClose: () => void;
  onSelect: (trip: PricedTrip) => void;
  onBaggage: (b: Baggage) => void;
  onWatch: () => void;
}

function airportName(code: string, result: DestinationResult): string {
  return ORIGINS[code as keyof typeof ORIGINS]?.name ?? result.destination.airports[code] ?? code;
}

function Leg({ label, flight, result }: { label: string; flight: Flight; result: DestinationResult }) {
  const a = airline(flight.airline);
  const nextDay = flight.arrival.slice(0, 10) !== flight.departure.slice(0, 10);
  return (
    <div className="pass">
      <div className="pass-top">
        <span className="pass-label">{label}</span>
        <span className="pass-date">{formatDay(flight.departure.slice(0, 10))}</span>
        <span className="pass-airline">
          <span className="airline-dot" style={{ background: a.color }} /> {a.name}
        </span>
      </div>
      <div className="pass-body">
        <div>
          <span className="pass-iata">{flight.from}</span>
          <span className="pass-time">{formatTime(flight.departure)}</span>
          <span className="small muted">{airportName(flight.from, result)}</span>
        </div>
        <div className="pass-mid">
          <span className="small">{formatDuration(flight.durationMin)}</span>
          <span className="route-line" aria-hidden>
            <i>✈</i>
          </span>
          <span className="small muted">diretto</span>
        </div>
        <div className="right">
          <span className="pass-iata">{flight.to}</span>
          <span className="pass-time">
            {formatTime(flight.arrival)}
            {nextDay && <sup>+1</sup>}
          </span>
          <span className="small muted">{airportName(flight.to, result)}</span>
        </div>
      </div>
      <div className="pass-foot">
        <span>
          Volo <b className="mono">{flight.flightNumber}</b>
        </span>
        {flight.terminal && (
          <span>
            Terminal <b className="mono">{flight.terminal}</b>
          </span>
        )}
        <span>
          Tariffa <b>{formatEur(flight.fare)}</b>
        </span>
      </div>
    </div>
  );
}

export function TripDetail(props: Props) {
  const { result, trip, prefs, provider, today, watched, onClose, onSelect, onBaggage, onWatch } = props;
  const d = result.destination;
  const a = airline(trip.airline);
  const origin = ORIGINS[trip.origin];
  const out = trip.outbound.departure.slice(0, 10);
  const back = trip.inbound.departure.slice(0, 10);
  const history = useMemo(() => destinationHistory(result.options, provider, today), [result, provider, today]);
  const hoursThere = Math.floor(minutesBetween(trip.outbound.arrival, trip.inbound.departure) / 60);
  const temp = d.climate[monthIndex(out)];
  const holidays = holidaysBetween(out, back);
  const booking = bookingUrl(trip, prefs.pax);
  const quotes = baggageQuotes(trip.airline, trip.destination);
  const hue = [...d.code].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const share = async () => {
    const text = shareText(trip);
    try {
      if (navigator.share) await navigator.share({ title: `Volo per ${d.city}`, text, url: booking.url });
      else await navigator.clipboard.writeText(`${text}\n${booking.url}`);
    } catch {
      // condivisione annullata
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <section className="detail" role="dialog" aria-modal aria-label={`Volo per ${d.city}`} onClick={(e) => e.stopPropagation()}>
        <header className="detail-hero" style={{ '--hue': hue } as CSSProperties}>
          <button className="icon-btn close" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
          <span className="stamp">{MODE_BY_ID[trip.mode].icon} {MODE_BY_ID[trip.mode].title}</span>
          <h2>
            {d.flag} {d.city}
          </h2>
          <p>{d.blurb}</p>
          <div className="hero-facts">
            {temp != null && <span>🌡️ ~{temp}°C di massima a {new Date(`${out}T00:00`).toLocaleString('it-IT', { month: 'long' })}</span>}
            <span>🕒 {hoursThere} ore sul posto</span>
            {d.tz !== 0 && <span>🌍 fuso {d.tz > 0 ? '+' : ''}{d.tz}h</span>}
            {holidays.map((h) => (
              <span key={h}>🎉 {h}</span>
            ))}
          </div>
        </header>

        <div className="detail-body">
          <div className="detail-col">
            <Leg label="Andata" flight={trip.outbound} result={result} />
            <Leg label="Ritorno" flight={trip.inbound} result={result} />

            <h4>Bagaglio</h4>
            <div className="bags">
              {quotes.map((q) => (
                <button key={q.option} className={`bag ${prefs.baggage === q.option ? 'on' : ''}`} onClick={() => onBaggage(q.option)}>
                  <span className="bag-icon">{q.option === 'personal' ? '🎒' : q.option === 'cabin' ? '🧳' : '🛄'}</span>
                  <span>
                    <b>{q.label}</b>
                    <span className="small muted">{q.detail}</span>
                  </span>
                  <span className="bag-price">{q.extra ? `+${formatEur(q.extra)}` : 'incluso'}</span>
                </button>
              ))}
            </div>
            <p className="small muted">Supplementi A/R per persona, stimati in base a compagnia e distanza.</p>

            <h4>Come arrivare in aeroporto</h4>
            <p className="small">
              🚆 {origin.transfer.label} · ~{origin.transfer.minutes} min · {formatEur(origin.transfer.priceOneWay)} a tratta.
              {trip.outbound.terminal && ` Partenza dal ${trip.outbound.terminal}.`} Arriva almeno{' '}
              {origin.bufferMin >= 120 ? '2 ore' : "1 ora e mezza"} prima.
            </p>
          </div>

          <div className="detail-col">
            <div className="cost">
              <div className="cost-row">
                <span>Tariffa A/R</span>
                <span>{formatEur(trip.cost.fare)}</span>
              </div>
              <div className="cost-row">
                <span>Bagaglio</span>
                <span>{trip.cost.baggage ? formatEur(trip.cost.baggage) : '—'}</span>
              </div>
              {prefs.includeTransfer && (
                <div className="cost-row">
                  <span>Transfer A/R</span>
                  <span>{formatEur(trip.cost.transfer)}</span>
                </div>
              )}
              <div className="cost-row total">
                <span>A persona</span>
                <span>{formatEur(trip.cost.perPax)}</span>
              </div>
              {prefs.pax > 1 && (
                <div className="cost-row grand">
                  <span>Totale {prefs.pax} viaggiatori</span>
                  <span>{formatEur(trip.cost.total)}</span>
                </div>
              )}
              <a className="btn primary buy" href={booking.url} target="_blank" rel="noreferrer">
                Acquista su {booking.direct ? a.name : 'Google Flights'} ↗
              </a>
              <div className="btn-row">
                <a className="btn" href={googleFlightsUrl(trip, prefs.pax)} target="_blank" rel="noreferrer">
                  Google Flights
                </a>
                <a className="btn" href={skyscannerUrl(trip, prefs.pax)} target="_blank" rel="noreferrer">
                  Skyscanner
                </a>
              </div>
              <div className="btn-row">
                <button className="btn" onClick={() => downloadIcs(trip)}>
                  📅 Calendario
                </button>
                <button className="btn" onClick={share}>
                  📤 Condividi
                </button>
                <button className={`btn ${watched ? 'on' : ''}`} onClick={onWatch}>
                  {watched ? '♥ Seguito' : '🔔 Avvisami'}
                </button>
              </div>
              <p className="small muted">
                {trip.source === 'demo'
                  ? 'Prezzi dimostrativi: sul sito della compagnia trovi la tariffa reale per queste date.'
                  : 'Tariffa live Ryanair: può cambiare fino al pagamento.'}
              </p>
            </div>

            <h4>
              Prezzo vs media <DealBadge pct={result.dealPct} />
            </h4>
            <Sparkline values={history} current={result.best.fare} average={result.avgFare} />

            <h4>Altre date ({result.options.length})</h4>
            <ul className="alt-dates">
              {result.options.slice(0, 12).map((o) => (
                <li key={o.id}>
                  <button className={o.id === trip.id ? 'on' : ''} onClick={() => onSelect(o)}>
                    <span>
                      {formatDay(o.outbound.departure.slice(0, 10))} → {formatDay(o.inbound.departure.slice(0, 10))}
                    </span>
                    <span className="small muted">
                      {o.origin} · {airline(o.airline).name}
                    </span>
                    <b>{formatEur(Math.round(o.cost.perPax))}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
