import { useState } from 'react';
import { ANY_DESTINATION } from '../lib/alerts';
import { formatEur } from '../lib/pricing';
import { matchesQuery } from '../lib/text';
import type { Destination } from '../types';

export interface DestinationOption {
  destination: Destination;
  /** Prezzo più basso attuale a persona, se la meta è nei risultati. */
  price?: number;
}

interface Props {
  value: string;
  options: DestinationOption[];
  onChange: (code: string) => void;
}

const MAX_RESULTS = 8;

/** Campo di ricerca con suggerimenti: le mete sono quasi cento, una select sarebbe scomoda. */
export function DestinationPicker({ value, options, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.destination.code === value);
  const matches = options.filter((o) => matchesQuery(o.destination, query)).slice(0, MAX_RESULTS);

  const pick = (code: string) => {
    onChange(code);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="picker">
      <input
        type="search"
        placeholder={value === ANY_DESTINATION ? '🌍 Qualsiasi meta — cerca una città' : selected ? `${selected.destination.flag} ${selected.destination.city}` : 'Cerca una città'}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        aria-label="Cerca una meta"
        aria-expanded={open}
      />
      {open && (
        <ul className="picker-list" role="listbox">
          {!query && (
            <li>
              <button type="button" className={value === ANY_DESTINATION ? 'on' : ''} onClick={() => pick(ANY_DESTINATION)}>
                <span>🌍 Qualsiasi meta</span>
              </button>
            </li>
          )}
          {matches.map(({ destination: d, price }) => (
            <li key={d.code}>
              <button type="button" className={value === d.code ? 'on' : ''} onClick={() => pick(d.code)}>
                <span>
                  {d.flag} <b>{d.city}</b> <span className="muted small">{d.country}</span>
                </span>
                {price != null && <span className="small picker-price">da {formatEur(Math.round(price))}</span>}
              </button>
            </li>
          ))}
          {!matches.length && <li className="muted small picker-empty">Nessun volo diretto da Milano per "{query}"</li>}
        </ul>
      )}
      <p className="small muted picker-current">
        Scelta:{' '}
        <b>{value === ANY_DESTINATION ? 'qualsiasi meta' : selected ? `${selected.destination.flag} ${selected.destination.city}` : value}</b>
      </p>
    </div>
  );
}
