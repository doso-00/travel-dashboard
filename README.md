# ✈️ Partenze · Milano

Dashboard per trovare i voli più convenienti in partenza da **Malpensa (MXP)**, **Bergamo (BGY)** e **Linate (LIN)**,
divisi in blocchi per tipo di viaggio e ordinati per prezzo.

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

## Dati

L'interfaccia `FlightProvider` (`src/providers/types.ts`) separa la sorgente dei voli dal resto dell'app.

- **Demo** (predefinito): orari e prezzi generati in modo deterministico con le dinamiche tipiche dei voli
  (giorno della settimana, anticipo, stagione, festività, fascia oraria, promo). Cambiano ogni giorno, quindi medie e alert
  funzionano come con dati veri. Il link d'acquisto porta comunque al sito reale.
- **Live Ryanair (beta)**: tariffe pubbliche Ryanair da BGY e MXP, attraverso il proxy di Vite (`/api/ryanair`), quindi solo con
  `npm run dev` o `npm run preview`. Se non risponde, la dashboard torna alla demo e lo segnala. Per i dati live la media
  si costruisce salvando ogni giorno il miglior prezzo nel browser.

Per aggiungere altre fonti (Amadeus, Duffel, Kiwi Tequila, SerpApi Google Flights…) basta implementare `FlightProvider`.

## Struttura

```
src/
  data/        aeroporti, compagnie (bagagli e link), mete, festività
  lib/         date e finestre di viaggio, prezzi, ricerca, alert, link
  providers/   demo e Ryanair
  components/  blocchi, biglietti, dettaglio, filtri, alert
```
