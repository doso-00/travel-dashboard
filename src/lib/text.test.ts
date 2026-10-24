import { describe, expect, it } from 'vitest';
import { DESTINATION_BY_CODE } from '../data/destinations';
import { matchesQuery, normalize } from './text';

describe('ricerca mete', () => {
  it('ignora maiuscole e accenti', () => {
    expect(normalize('  Kraków ')).toBe('krakow');
  });

  it('trova per città, paese, codice o aeroporto', () => {
    const lon = DESTINATION_BY_CODE.LON;
    expect(matchesQuery(lon, 'lond')).toBe(true);
    expect(matchesQuery(lon, 'regno')).toBe(true);
    expect(matchesQuery(lon, 'stn')).toBe(true);
    expect(matchesQuery(lon, 'gatwick')).toBe(true);
    expect(matchesQuery(lon, 'sofia')).toBe(false);
    expect(matchesQuery(lon, '')).toBe(true);
  });
});
