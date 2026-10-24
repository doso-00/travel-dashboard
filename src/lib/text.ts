import type { Destination } from '../types';

/** Minuscolo e senza accenti, per cercare "Cracovia" scrivendo "cracov" o "Kraków" con "krakow". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function matchesQuery(d: Destination, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return [d.city, d.country, d.code, ...Object.keys(d.airports), ...Object.values(d.airports)].some((field) => normalize(field).includes(q));
}
