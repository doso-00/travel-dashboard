import { describe, expect, it } from 'vitest';
import { tripWindows, weekday } from './dates';

const pairs = (mode: Parameters<typeof tripWindows>[0], today: string, weeks = 2) =>
  tripWindows(mode, today, weeks).map((w) => `${w.out}>${w.back}`);

describe('tripWindows', () => {
  // 2026-10-21 è un mercoledì.
  it('weekend: ven→dom e sab→dom', () => {
    expect(pairs('weekend', '2026-10-21', 1)).toEqual(['2026-10-23>2026-10-25', '2026-10-24>2026-10-25']);
  });

  it('weekend: di sabato resta solo il rientro di domenica del weekend in corso', () => {
    expect(pairs('weekend', '2026-10-24', 1)).toEqual(['2026-10-24>2026-10-25']);
  });

  it('weekend lungo: ven→lun con ±1 giorno, almeno 2 notti, senza il weekend classico', () => {
    const p = pairs('long-weekend', '2026-10-21', 1);
    expect(p).toEqual([
      '2026-10-22>2026-10-25',
      '2026-10-22>2026-10-26',
      '2026-10-22>2026-10-27',
      '2026-10-23>2026-10-26',
      '2026-10-23>2026-10-27',
      '2026-10-24>2026-10-26',
      '2026-10-24>2026-10-27',
    ]);
    expect(p).not.toContain('2026-10-23>2026-10-25');
  });

  it('weekend lungo: le partenze di oggi vanno nel blocco Flash', () => {
    expect(pairs('long-weekend', '2026-10-22', 1)[0]).toBe('2026-10-23>2026-10-26');
  });

  it('settimana: partenza sab/dom/lun per 6-7 notti', () => {
    const w = tripWindows('week', '2026-10-21', 2);
    expect(w.every((x) => [0, 1, 6].includes(weekday(x.out)) && [6, 7].includes(x.nights))).toBe(true);
    expect(w.length).toBe(3 * 6);
  });

  it('flash: oggi, rientro dopo 1 o 2 notti', () => {
    expect(pairs('flash', '2026-10-21')).toEqual(['2026-10-21>2026-10-22', '2026-10-21>2026-10-23']);
  });
});
