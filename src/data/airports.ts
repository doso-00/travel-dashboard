import type { OriginCode } from '../types';

export interface OriginAirport {
  code: OriginCode;
  name: string;
  short: string;
  /** Minuti minimi tra l'apertura della dashboard e il decollo (viaggio + controlli). */
  bufferMin: number;
  transfer: { label: string; minutes: number; priceOneWay: number };
}

export const ORIGINS: Record<OriginCode, OriginAirport> = {
  MXP: {
    code: 'MXP',
    name: 'Milano Malpensa',
    short: 'Malpensa',
    bufferMin: 150,
    transfer: { label: 'Malpensa Express da Cadorna/Centrale', minutes: 52, priceOneWay: 13 },
  },
  BGY: {
    code: 'BGY',
    name: 'Milano Bergamo (Orio al Serio)',
    short: 'Bergamo',
    bufferMin: 150,
    transfer: { label: 'Bus navetta da Milano Centrale', minutes: 50, priceOneWay: 10 },
  },
  LIN: {
    code: 'LIN',
    name: 'Milano Linate',
    short: 'Linate',
    bufferMin: 90,
    transfer: { label: 'Metro M4 da San Babila', minutes: 15, priceOneWay: 2.2 },
  },
};

export const ORIGIN_CODES = Object.keys(ORIGINS) as OriginCode[];

/** Terminal di Malpensa per compagnia (easyJet opera dal T2). */
export function terminalFor(origin: string, airline: string): string | undefined {
  if (origin !== 'MXP') return undefined;
  return airline === 'U2' ? 'T2' : 'T1';
}
