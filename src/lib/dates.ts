import type { DateWindow, TripMode } from '../types';

// Le date sono stringhe YYYY-MM-DD; i calcoli avvengono a mezzanotte UTC
// così i cambi d'ora legale non spostano i giorni.

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** 0 = domenica … 6 = sabato. */
export function weekday(date: string): number {
  return parse(date).getUTCDay();
}

/** Data locale (fuso del browser) di un istante. */
export function localDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Istante "locale" YYYY-MM-DDTHH:mm del browser. */
export function localDateTime(now: Date): string {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${localDate(now)}T${hh}:${mm}`;
}

/** Somma minuti a un orario locale YYYY-MM-DDTHH:mm. */
export function addMinutes(dateTime: string, minutes: number): string {
  const d = new Date(`${dateTime}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}:00Z`).getTime() - new Date(`${a}:00Z`).getTime()) / 60_000);
}

const FRI = 5;

/** Primo venerdì da oggi in poi (oggi incluso se è venerdì). */
function nextFriday(today: string): string {
  return addDays(today, (FRI - weekday(today) + 7) % 7);
}

/**
 * Coppie (andata, ritorno) per ogni modalità:
 * - flash: oggi, rientro dopo 1-2 notti
 * - weekend: ven→dom, sab→dom
 * - long-weekend: ven→lun con ±1 giorno (gio/ven/sab → lun/mar, più gio→dom)
 * - week: partenza sab/dom/lun, 6-7 notti
 */
export function tripWindows(mode: TripMode, today: string, horizonWeeks: number): DateWindow[] {
  const windows: DateWindow[] = [];
  const push = (out: string, back: string) => {
    if (out < today) return;
    windows.push({ mode, out, back, nights: daysBetween(out, back) });
  };

  if (mode === 'flash') {
    push(today, addDays(today, 1));
    push(today, addDays(today, 2));
    return windows;
  }

  // Se oggi è sabato o domenica il weekend in corso conta ancora.
  const firstFri = addDays(nextFriday(today), weekday(today) === 6 || weekday(today) === 0 ? -7 : 0);
  const weeks = mode === 'week' ? Math.round(horizonWeeks * 1.5) : horizonWeeks;

  for (let w = 0; w < weeks; w++) {
    const fri = addDays(firstFri, w * 7);
    const at = (offset: number) => addDays(fri, offset);
    if (mode === 'weekend') {
      push(at(0), at(2));
      push(at(1), at(2));
    } else if (mode === 'long-weekend') {
      for (const [o, b] of [
        [-1, 2], [-1, 3], [-1, 4],
        [0, 3], [0, 4],
        [1, 3], [1, 4],
      ]) push(at(o), at(b));
    } else {
      for (const o of [1, 2, 3]) for (const n of [6, 7]) push(at(o), at(o + n));
    }
  }
  // Le partenze di oggi sono del blocco Flash; solo il weekend in corso le tiene.
  return windows.filter((w) => w.out > today || mode === 'weekend');
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function formatDay(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[weekday(date)]} ${d} ${MONTHS[m - 1]}`;
}

export function formatTime(dateTime: string): string {
  return dateTime.slice(11, 16);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${String(m).padStart(2, '0')}m` : ''}` : `${m}m`;
}

export function monthIndex(date: string): number {
  return Number(date.slice(5, 7)) - 1;
}
