import { ORIGINS, ORIGIN_CODES } from '../data/airports';
import { TAG_LABELS } from '../data/destinations';
import { MODES } from '../lib/modes';
import type { Baggage, Prefs, Tag } from '../types';

export type SortKey = 'price' | 'deal' | 'date';

interface Props {
  prefs: Prefs;
  sort: SortKey;
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

export function Controls({ prefs, sort, onChange, onSort }: Props) {
  return (
    <section className="controls" aria-label="Filtri">
      <div className="control">
        <span className="control-label">Da</span>
        <div className="chips">
          {ORIGIN_CODES.map((code) => (
            <button
              key={code}
              className={`chip ${prefs.origins.includes(code) ? 'on' : ''}`}
              title={ORIGINS[code].name}
              onClick={() => {
                const next = toggle(prefs.origins, code);
                if (next.length) onChange({ origins: next });
              }}
            >
              <b className="mono">{code}</b> {ORIGINS[code].short}
            </button>
          ))}
        </div>
      </div>

      <div className="control">
        <span className="control-label">Bagaglio</span>
        <div className="segmented">
          {BAGS.map((b) => (
            <button key={b.id} className={prefs.baggage === b.id ? 'on' : ''} onClick={() => onChange({ baggage: b.id })}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

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

      <div className="control grow">
        <span className="control-label">
          Budget a persona <b>{prefs.maxBudget == null ? 'illimitato' : `≤ ${prefs.maxBudget} €`}</b>
        </span>
        <input
          type="range"
          min={20}
          max={400}
          step={10}
          value={prefs.maxBudget ?? 400}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ maxBudget: v >= 400 ? null : v });
          }}
        />
      </div>

      <div className="control">
        <span className="control-label">Orizzonte</span>
        <select value={prefs.horizonWeeks} onChange={(e) => onChange({ horizonWeeks: Number(e.target.value) })}>
          <option value={4}>4 settimane</option>
          <option value={8}>8 settimane</option>
          <option value={12}>12 settimane</option>
        </select>
      </div>

      <div className="control">
        <span className="control-label">Ordina per</span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
          <option value="price">Prezzo</option>
          <option value="deal">Affare vs media</option>
          <option value="date">Data più vicina</option>
        </select>
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

      <div className="control wide">
        <span className="control-label">Blocchi</span>
        <div className="chips">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`chip ${prefs.modes.includes(m.id) ? 'on' : ''}`}
              onClick={() => {
                const next = toggle(prefs.modes, m.id);
                if (next.length) onChange({ modes: MODES.map((x) => x.id).filter((id) => next.includes(id)) });
              }}
            >
              {m.icon} {m.title}
            </button>
          ))}
        </div>
      </div>

      <div className="control toggles">
        <label className="switch">
          <input type="checkbox" checked={prefs.includeTransfer} onChange={(e) => onChange({ includeTransfer: e.target.checked })} />
          <span>Includi transfer da Milano</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={prefs.afterWork} onChange={(e) => onChange({ afterWork: e.target.checked })} />
          <span>Venerdì solo dopo le 17</span>
        </label>
      </div>
    </section>
  );
}
