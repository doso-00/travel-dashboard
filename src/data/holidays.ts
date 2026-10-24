import { addDays, toISODate } from '../lib/dates';

/** Domenica di Pasqua (algoritmo gregoriano anonimo). */
function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISODate(new Date(Date.UTC(year, month - 1, day)));
}

/** Festività nazionali italiane più Sant'Ambrogio (patrono di Milano). */
export function holidaysOf(year: number): Record<string, string> {
  const fixed: [string, string][] = [
    ['01-01', 'Capodanno'],
    ['01-06', 'Epifania'],
    ['04-25', 'Liberazione'],
    ['05-01', 'Festa del Lavoro'],
    ['06-02', 'Festa della Repubblica'],
    ['08-15', 'Ferragosto'],
    ['11-01', 'Ognissanti'],
    ['12-07', "Sant'Ambrogio"],
    ['12-08', 'Immacolata'],
    ['12-25', 'Natale'],
    ['12-26', 'Santo Stefano'],
  ];
  const out: Record<string, string> = {};
  for (const [md, name] of fixed) out[`${year}-${md}`] = name;
  const e = easter(year);
  out[e] = 'Pasqua';
  out[addDays(e, 1)] = 'Pasquetta';
  return out;
}

const cache = new Map<number, Record<string, string>>();

export function holidayName(date: string): string | undefined {
  const year = Number(date.slice(0, 4));
  if (!cache.has(year)) cache.set(year, holidaysOf(year));
  return cache.get(year)![date];
}

/** Festività che cadono nel periodo [out, back]. */
export function holidaysBetween(out: string, back: string): string[] {
  const names: string[] = [];
  for (let d = out; d <= back; d = addDays(d, 1)) {
    const name = holidayName(d);
    if (name) names.push(name);
  }
  return names;
}
