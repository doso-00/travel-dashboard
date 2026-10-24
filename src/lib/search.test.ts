import { describe, expect, it } from 'vitest';
import { demoProvider } from '../providers/demo';
import type { Prefs } from '../types';
import { evaluateAlerts } from './alerts';
import { baggageQuotes, tripCost } from './pricing';
import { computeAverages, groupByDestination, searchMode } from './search';

const prefs: Prefs = {
  origins: ['MXP', 'BGY', 'LIN'],
  baggage: 'personal',
  pax: 2,
  includeTransfer: false,
  horizonWeeks: 4,
  maxBudget: null,
  tags: [],
  afterWork: false,
  modes: ['flash', 'weekend', 'long-weekend', 'week'],
  provider: 'demo',
};

describe('ricerca demo', () => {
  const now = new Date(2026, 9, 21, 10, 30); // mer 21 ott 10:30
  const today = '2026-10-21';

  it('flash: solo partenze di oggi dopo il tempo per arrivare in aeroporto', async () => {
    const trips = await searchMode('flash', demoProvider, prefs, now, today);
    expect(trips.length).toBeGreaterThan(0);
    for (const t of trips) {
      expect(t.outbound.departure.slice(0, 10)).toBe(today);
      const minTime = t.origin === 'LIN' ? '12:00' : '13:00';
      expect(t.outbound.departure.slice(11) >= minTime).toBe(true);
    }
  });

  it('ordina le mete per prezzo totale e tiene una opzione per coppia di date', async () => {
    const trips = await searchMode('weekend', demoProvider, prefs, now, today);
    const results = groupByDestination(trips, prefs, computeAverages(trips, demoProvider, today));
    const totals = results.map((r) => r.best.cost.total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    for (const r of results) {
      const keys = r.options.map((o) => o.outbound.departure.slice(0, 10) + o.inbound.departure.slice(0, 10));
      expect(new Set(keys).size).toBe(keys.length);
      expect(r.avgFare).not.toBeNull();
    }
  });

  it('è deterministica a parità di giorno', async () => {
    const a = await searchMode('week', demoProvider, prefs, now, today);
    const b = await searchMode('week', demoProvider, prefs, now, today);
    expect(a).toEqual(b);
  });

  it('le mete a lungo raggio compaiono solo nella settimana', async () => {
    const lw = await searchMode('long-weekend', demoProvider, prefs, now, today);
    expect(lw.some((t) => t.destination === 'NYC')).toBe(false);
    const wk = await searchMode('week', demoProvider, prefs, now, today);
    expect(wk.some((t) => t.destination === 'NYC')).toBe(true);
  });
});

describe('costi', () => {
  it('trolley incluso per le compagnie tradizionali, a pagamento per le low cost', () => {
    expect(baggageQuotes('AZ', 'CTA').find((q) => q.option === 'cabin')!.extra).toBe(0);
    expect(baggageQuotes('FR', 'CTA').find((q) => q.option === 'cabin')!.extra).toBeGreaterThan(0);
  });

  it('somma tariffa, bagaglio e transfer per persona e per il gruppo', () => {
    const trip = { airline: 'FR', destination: 'BCN', origin: 'BGY' as const, fare: 40 };
    const bag = baggageQuotes('FR', 'BCN').find((q) => q.option === 'checked')!.extra;
    const c = tripCost(trip, { baggage: 'checked', pax: 2, includeTransfer: true });
    expect(c.perPax).toBe(40 + bag + 20);
    expect(c.total).toBe(c.perPax * 2);
  });
});

describe('alert', () => {
  it('scatta sotto la soglia di prezzo', async () => {
    const now = new Date(2026, 9, 21, 10, 30);
    const trips = await searchMode('weekend', demoProvider, prefs, now, '2026-10-21');
    const results = groupByDestination(trips, prefs, computeAverages(trips, demoProvider, '2026-10-21'));
    const bcn = results.find((r) => r.destination.code === 'BCN')!;
    const base = { id: '1', destination: 'BCN', mode: 'weekend' as const, dropPct: null, createdAt: '' };
    expect(evaluateAlerts([{ ...base, maxPrice: bcn.best.cost.perPax }], results)).toHaveLength(1);
    expect(evaluateAlerts([{ ...base, maxPrice: bcn.best.cost.perPax - 1 }], results)).toHaveLength(0);
  });
});
