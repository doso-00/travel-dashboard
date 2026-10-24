import type { DateWindow, OriginCode, TripMode, TripOption } from '../types';

export interface SearchContext {
  now: Date;
  today: string;
  origins: OriginCode[];
  /** Weekend: il venerdì si parte solo dopo le 17. */
  afterWork: boolean;
}

export interface FlightProvider {
  id: 'demo' | 'ryanair';
  label: string;
  search(mode: TripMode, windows: DateWindow[], ctx: SearchContext): Promise<TripOption[]>;
  /**
   * Miglior tariffa base (A/R) giorno per giorno tra le opzioni date, negli
   * ultimi `days` giorni, dalla più vecchia a oggi.
   */
  history?(trips: TripOption[], today: string, days: number): number[];
}
