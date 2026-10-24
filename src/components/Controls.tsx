import { useState } from 'react';
import { ORIGINS, ORIGIN_CODES } from '../data/airports';
import { TAG_LABELS } from '../data/destinations';
import type { Baggage, Prefs, Tag } from '../types';

export type SortKey = 'price' | 'deal' | 'date';

interface Props {
  prefs: Prefs;
  sort: SortKey;
  query: string;
  onQuery: (q: string) => void;
  onChange: (patch: Partial<Prefs>) => void;
  onSort: (s: SortKey) => void;
}

const BAGS: { id: Baggage; label: string }[] = [
  { id: 'personal', label: '🎒 Zaino' },
  { id: 'cabin', label: '🧳 Trolley' },
  { id: 'checked', label: '🛄 Stiva' },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Filtri principali sempre visibili; il resto in un pannello che si apre a richiesta. */
export function Controls({ prefs, sort, query, onQuery, onChange, onSort }: Props) {
  const [open, setOpen] = useState(false);
  const extra =
    (prefs.pax > 1 ? 1 : 0) +
    (prefs.maxBudget != null ? 1 : 0) +
    prefs.tags.length +
    (prefs.includeTransfer ? 1 : 0) +
    (prefs.afterWork ? 1 : 0) +
    (sort !== 'price' ? 1 : 0) +
    (prefs.horizonWeeks !== 8 ? 1 : 0);

  return (
    <section className="controls" aria-label="Filtri">
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="🔎 Cerca una meta (es. Sofia, Grecia, LIS)"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Cerca una meta"
        />
        <div className="chips" role="group" aria-label="Aeroporti di partenza">
          {ORIGIN_CODES.map((code) => (
            <button
              key={code}
              className={`chip ${prefs.origins.includes(code) ? 'on' : ''}`}
              title={ORIGINS[code].name}
              aria-pressed={prefs.origins.includes(code)}
              onClick={() => {
                const next = toggle(prefs.origins, code);
                if (next.length) onChange({ origins: next });
              }}
            >
              <b className="mono">{code}</b>
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Bagaglio">
          {BAGS.map((b) => (
            <button key={b.id} className={prefs.baggage === b.id ? 'on' : ''} aria-pressed={prefs.baggage === b.id} onClick={() => onChange({ baggage: b.id })}>
              {b.label}
            </button>
          ))}
        </div>
        <button className={`btn filters-btn ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          ⚙️ Filtri{extra > 0 && <span className="count">{extra}</span>}
        </button>
      </div>

      {open && (
        <div className="filters-panel">
          <div className="control">
            <span className="control-label">Viaggiatori</span>
            <div className="stepper">
              <button onClick={() => onChange({ pax: Math.max(1, prefs.pax - 1) })} aria-label="Meno viaggiatori">
                −
              </button>
              <span>{prefs.pax}</span>
              <button onClick={() => onChange({ pax: Math.min(9, prefs.pax + 1) })} aria-label="Più viaggiatori">
                +
              </button>
            </div>
          </div>

          <div className="control">
            <span className="control-label">Ordina per</span>
            <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
              <option value="price">Prezzo</option>
              <option value="deal">Affare vs media</option>
              <option value="date">Data più vicina</option>
            </select>
          </div>

          <div className="control">
            <span className="control-label">Orizzonte</span>
            <select value={prefs.horizonWeeks} onChange={(e) => onChange({ horizonWeeks: Number(e.target.value) })}>
              <option value={4}>4 settimane</option>
              <option value={8}>8 settimane</option>
              <option value={12}>12 settimane</option>
            </select>
          </div>

          <div className="control wide">
            <span className="control-label">
              Budget a persona <b>{prefs.maxBudget == null ? 'illimitato' : `≤ ${prefs.maxBudget} €`}</b>
            </span>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={prefs.maxBudget ?? 400}
              aria-label="Budget massimo a persona"
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ maxBudget: v >= 400 ? null : v });
              }}
            />
          </div>

          <div className="control wide">
            <span className="control-label">Mood</span>
            <div className="chips">
              {(Object.keys(TAG_LABELS) as Tag[]).map((t) => (
                <button key={t} className={`chip ${prefs.tags.includes(t) ? 'on' : ''}`} onClick={() => onChange({ tags: toggle(prefs.tags, t) })}>
                  {TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="control wide toggles">
            <label className="switch">
              <input type="checkbox" checked={prefs.includeTransfer} onChange={(e) => onChange({ includeTransfer: e.target.checked })} />
              <span>Includi transfer da Milano</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={prefs.afterWork} onChange={(e) => onChange({ afterWork: e.target.checked })} />
              <span>Venerdì solo dopo le 17</span>
            </label>
          </div>

          <div className="control wide panel-foot">
            <div className="segmented small" role="group" aria-label="Fonte dati">
              <button className={prefs.provider === 'live' ? 'on' : ''} onClick={() => onChange({ provider: 'live' })}>
                Prezzi reali
              </button>
              <button className={prefs.provider === 'demo' ? 'on' : ''} onClick={() => onChange({ provider: 'demo' })}>
                Demo
              </button>
            </div>
            <button
              className="btn small"
              onClick={() => {
                onChange({ pax: 1, maxBudget: null, tags: [], includeTransfer: false, afterWork: false, horizonWeeks: 8 });
                onSort('price');
              }}
            >
              Azzera filtri
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
