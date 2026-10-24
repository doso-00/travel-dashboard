import type { TripMode } from '../types';

export const MODES: { id: TripMode; icon: string; title: string; rule: string }[] = [
  { id: 'flash', icon: '⚡', title: 'Flash', rule: 'Si parte oggi, rientro dopo 1-2 notti' },
  { id: 'weekend', icon: '🌅', title: 'Weekend', rule: 'Ven o sab → dom' },
  { id: 'long-weekend', icon: '🧭', title: 'Weekend lungo', rule: 'Ven → lun ±1 giorno · 2-5 notti' },
  { id: 'week', icon: '🧳', title: 'Settimana', rule: 'Partenza sab/dom/lun · 6-7 notti · anche lungo raggio' },
];

export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m])) as Record<TripMode, (typeof MODES)[number]>;
