import { formatEur } from '../lib/pricing';

interface Props {
  values: number[];
  current: number;
  average: number | null;
}

/** Andamento del miglior prezzo negli ultimi giorni, con la media tratteggiata. */
export function Sparkline({ values, current, average }: Props) {
  if (values.length < 2) {
    return <p className="muted small">Lo storico si costruisce giorno dopo giorno: torna domani per vedere la media.</p>;
  }
  const w = 320;
  const h = 84;
  const pad = 6;
  const min = Math.min(...values, current);
  const max = Math.max(...values, current);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const minIdx = values.indexOf(Math.min(...values));

  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Andamento prezzi, media ${average ? formatEur(average) : 'n.d.'}`}>
        <path d={area} className="spark-area" />
        {average != null && <line x1={pad} x2={w - pad} y1={y(average)} y2={y(average)} className="spark-avg" />}
        <path d={line} className="spark-line" />
        <circle cx={x(minIdx)} cy={y(values[minIdx])} r={3} className="spark-min" />
        <circle cx={x(values.length - 1)} cy={y(current)} r={4.5} className="spark-now" />
      </svg>
      <figcaption>
        <span>{values.length} giorni fa</span>
        <span>
          min <b>{formatEur(Math.min(...values))}</b> · media <b>{average != null ? formatEur(average) : '—'}</b> · max{' '}
          <b>{formatEur(Math.max(...values))}</b>
        </span>
        <span>oggi</span>
      </figcaption>
    </figure>
  );
}
