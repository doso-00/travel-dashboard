# ✈️ Partenze · Milano

Dashboard per trovare i voli più convenienti in partenza da **Malpensa (MXP)**, **Bergamo (BGY)** e **Linate (LIN)**,
divisi in blocchi per tipo di viaggio e ordinati per prezzo.

Online: **https://raw.githack.com/doso-00/travel-dashboard/gh-pages/index.html** (serve il branch `gh-pages`
così com'è, senza configurazioni). Per l'indirizzo ufficiale https://doso-00.github.io/travel-dashboard/ basta attivare
una volta GitHub Pages: Settings → Pages → Source "Deploy from a branch" → `gh-pages` / root.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test della logica (date, prezzi, alert)
npm run build    # build statica in dist/
```

## Blocchi

| Blocco | Regola |
| --- | --- |
| ⚡ **Flash** | Decollo **oggi**, solo voli che partono dopo l'ora di accesso + il tempo per arrivare in aeroporto (2h30 per MXP/BGY, 1h30 per LIN); rientro dopo 1-2 notti |
| 🌅 **Weekend** | Ven → dom oppure sab → dom (opzione "venerdì solo dopo le 17") |
| 🧭 **Weekend lungo** | Ven → lun con ±1 giorno: partenza gio/ven/sab, rientro dom/lun/mar, 2-5 notti (escluso il weekend classico) |
| 🧳 **Settimana** | Partenza sab/dom/lun, 6-7 notti; include le mete a lungo raggio (New York, Dubai) |

Per ogni meta il motore prova tutte le coppie di date, aeroporti e compagnie e tiene la combinazione più economica
**con il bagaglio scelto**: con il trolley una compagnia tradizionale può battere una low cost.

## Funzionalità

- **Filtri**: aeroporti, bagaglio (zaino / trolley / stiva), viaggiatori, budget a persona, orizzonte (4-12 settimane),
  mood (mare, city, cibo, party, natura, cultura), ordinamento (prezzo, affare vs media, data), blocchi visibili.
- **Costo totale reale**: tariffa A/R + bagaglio (stimato per compagnia e distanza) + transfer da Milano (opzionale),
  per persona e per il gruppo.
- **Dettaglio volo**: orari, numero volo, compagnia, terminal, durata, ore sul posto, fuso, temperatura media del mese,
  festività nel periodo, confronto bagagli, come arrivare in aeroporto, andamento del prezzo negli ultimi 60 giorni con la media
  e tutte le altre date disponibili.
- **Acquista**: apre il sito della compagnia con tratta, date e passeggeri già impostati (Ryanair, easyJet, Wizz Air);
  per le altre compagnie apre Google Flights. Ci sono anche i link a Google Flights e Skyscanner.
- **Watchlist e alert**: ♡ su una meta oppure alert personalizzati (prezzo massimo o sconto % rispetto alla media del periodo).
  Le notifiche arrivano dal browser e, se imposti un topic [ntfy](https://ntfy.sh), anche sul telefono.
  Con la dashboard aperta il controllo si ripete ogni 30 minuti.
- **Extra**: 🎉 ponti e festività in arrivo (incluso Sant'Ambrogio), 🎲 "Sorprendimi", 📅 esportazione su calendario (.ics),
  📤 condivisione, tema chiaro/scuro automatico, layout mobile.

## Dati reali, gratis

Il browser non può interrogare direttamente le API delle compagnie (CORS), quindi i prezzi li raccoglie
**GitHub Actions** (`.github/workflows/update-fares.yml`), gratis sui repository pubblici:

1. ogni 3 ore `scripts/update-fares.ts` scarica le tariffe, aggiorna lo storico e invia gli alert;
2. la dashboard viene ricompilata e pubblicata sul branch `gh-pages` insieme a `data/fares.json`;
3. la pagina legge quel file statico: niente server, niente CORS, e la media del periodo è calcolata
   sullo storico vero raccolto run dopo run.

Fonti:

- **Ryanair fare finder** (API pubblica non ufficiale) per BGY e MXP. Sempre attiva.
- **Travelpayouts / Aviasales Data API**: tutte le compagnie e Linate, prezzi in cache delle ultime ~48 ore.
  Si attiva registrandosi gratis su [travelpayouts.com](https://www.travelpayouts.com) e salvando il token come secret
  del repository `TRAVELPAYOUTS_TOKEN` (Settings → Secrets and variables → Actions).

Se non arrivano dati reali, la dashboard passa da sola ai dati **demo** (simulati, deterministici) e lo segnala.
Il selettore "Prezzi reali / Demo" in alto permette di passare dall'una all'altra.

Per lanciare la raccolta a mano: `TZ=Europe/Rome npm run update-fares` (scrive `public/data/fares.json`).

## Alert sul telefono

Gli alert in `config/alerts.json` sono controllati dal workflow anche a dashboard chiusa e inviati con
[ntfy](https://ntfy.sh): installa l'app ntfy e iscriviti al topic indicato in `ntfyTopic`.
Gli alert predefiniti avvisano per qualsiasi meta sotto i 25 € a/r (le vere promo: Ryanair parte da 29,98 €)
o almeno il 40% sotto la media.
`"destination": "*"` vale per qualsiasi meta. Gli alert creati nella pagina (♡ e pannello 🔔) restano nel browser
e notificano mentre la dashboard è aperta.

L'interfaccia `FlightProvider` (`src/providers/types.ts`) separa le fonti dal resto dell'app: per aggiungerne una basta
implementarla e usarla nello script.

## Struttura

```
src/
  data/        aeroporti, compagnie (bagagli e link), mete, festività
  lib/         date e finestre di viaggio, prezzi, ricerca, alert, link
  providers/   demo, prezzi reali (fares.json), Ryanair, Travelpayouts
scripts/       raccolta prezzi e alert (GitHub Actions)
config/        alert lato server
  components/  blocchi, biglietti, dettaglio, filtri, alert
```
