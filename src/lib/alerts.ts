import type { AlertHit, DestinationResult, PriceAlert } from '../types';
import { formatEur } from './pricing';

/** Valore di `destination` per un alert valido su qualsiasi meta. */
export const ANY_DESTINATION = '*';

/** Alert soddisfatti dai risultati correnti (prezzo per persona, bagaglio incluso). */
export function evaluateAlerts(alerts: PriceAlert[], results: DestinationResult[]): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const alert of alerts) {
    const candidates = results
      .filter((r) => (alert.destination === ANY_DESTINATION || r.destination.code === alert.destination) && (alert.mode === 'any' || r.mode === alert.mode))
      .sort((a, b) => a.best.cost.perPax - b.best.cost.perPax);
    for (const result of candidates) {
      const reasons: string[] = [];
      if (alert.maxPrice != null && result.best.cost.perPax <= alert.maxPrice) {
        reasons.push(`${formatEur(result.best.cost.perPax)} ≤ soglia ${formatEur(alert.maxPrice)}`);
      }
      if (alert.dropPct != null && result.dealPct != null && result.dealPct >= alert.dropPct) {
        reasons.push(`-${result.dealPct}% rispetto alla media`);
      }
      if (reasons.length) {
        hits.push({ alert, result, reason: reasons.join(' · ') });
        break;
      }
    }
  }
  return hits;
}

/** Chiave che evita di notificare due volte lo stesso prezzo. */
export function hitKey(hit: AlertHit): string {
  return `${hit.result.best.id}@${hit.result.best.cost.perPax}`;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function notify(title: string, body: string, ntfyTopic?: string): Promise<void> {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✈️</text></svg>' });
  }
  // ntfy.sh: notifiche push sul telefono senza account, basta un "topic" segreto.
  if (ntfyTopic) {
    try {
      await fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
        method: 'POST',
        body,
        headers: { Title: title, Tags: 'airplane' },
      });
    } catch {
      // la notifica del browser è già partita
    }
  }
}
