import { afterEach, describe, expect, it, vi } from 'vitest';
import { tripWindows } from '../lib/dates';
import { searchMode } from '../lib/search';
import { demoProvider } from './demo';
import { liveProvider, resetLiveCache, type FaresFile } from './live';

const now = new Date(2026, 9, 21, 12, 0); // mer 21 ott 12:00
const today = '2026-10-21';
const prefs = { origins: ['MXP', 'BGY', 'LIN'] as const, horizonWeeks: 8, afterWork: false };

async function fakeFile(): Promise<FaresFile> {
  const flash = await searchMode('flash', demoProvider, { ...prefs, origins: [...prefs.origins] }, new Date(2026, 9, 21, 0, 0), today);
  const weekend = await searchMode('weekend', demoProvider, { ...prefs, origins: [...prefs.origins] }, now, today);
  return {
    version: 1,
    generatedAt: now.toISOString(),
    sources: { Ryanair: { ok: true, trips: flash.length + weekend.length } },
    trips: [...flash, ...weekend],
    destinations: [],
    history: { 'weekend:BCN': { '2026-10-19': 50, '2026-10-20': 40, '2026-10-21': 30 } },
    notified: [],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetLiveCache();
});

describe('provider prezzi reali', () => {
  it('filtra per modalità, aeroporti e voli flash ancora prendibili', async () => {
    const file = await fakeFile();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(file))));
    const ctx = { now, today, origins: ['BGY' as const], afterWork: false };
    const flash = await liveProvider.search('flash', tripWindows('flash', today, 0), ctx);
    expect(flash.length).toBeGreaterThan(0);
    expect(flash.every((t) => t.mode === 'flash' && t.origin === 'BGY' && t.outbound.departure >= '2026-10-21T14:30')).toBe(true);
    const weekend = await liveProvider.search('weekend', tripWindows('weekend', today, 2), ctx);
    expect(weekend.every((t) => t.outbound.departure < '2026-11-02')).toBe(true);
    expect(liveProvider.history!([weekend.find((t) => t.destination === 'BCN')!], today, 60)).toEqual([50, 40, 30]);
    expect(liveProvider.describe!()).toMatch(/^Aggiornati alle \d\d:\d\d$/);
  });

  it('segnala quando il file non è disponibile', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 404 })));
    await expect(liveProvider.search('weekend', [], { now, today, origins: ['BGY'], afterWork: false })).rejects.toThrow(/non disponibili/);
  });
});
