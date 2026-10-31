# Fase 13 — SEO, legal, audit e polish

Stato: **in corso** (blocco principale fatto il 31 ottobre 2026).

## 13.1 — Audit RLS (fatto)

Verifica su tutto lo schema: nessuna tabella senza RLS, nessuna tabella con RLS
ma senza policy, nessuna scrittura anonima oltre ai due form pubblici
(`contact_messages`, `takedown_notices`) che hanno `with_check` stretto.
Esito: nessuna correzione necessaria.

## 13.2 — Testi legali reali (fatto)

- `/privacy`, `/terms`, `/cookies` non sono più segnaposto: contenuti in
  `lib/legal/content.ts`, IT/EN, con titolare, finalità, cookie, sub-responsabili,
  conservazione, diritti.
- Titolare: **OpenStage — Francesco Sorrentino** (dicitura da confermare), contatto
  `ciao@getopenstage.it`.
- **Player Spotify click-to-load**: nessun iframe al primo caricamento; si attiva
  con un pulsante e la scelta resta nel browser. Gate applicato anche a
  `/playlists`, che ora carica l'embed solo dopo il clic.
- Nessun banner cookie: non ci sono cookie di profilazione. Se un giorno
  arriveranno, andrà introdotto il consenso.

## 13.3 — Cancellazione account ed export (fatto)

- Export JSON da `/dashboard/impostazioni/esporta`: profilo, scheda, eventi,
  preferiti, follow, booking con messaggi, chiamate.
- Cancellazione da `/dashboard/impostazioni`: richiede di scrivere `ELIMINA`.
- FK riscritte perché cancellare una persona non cancelli i dati di altre:
  `artists.profile_id`, `booking_threads.created_by`,
  `booking_messages.sender_id` → `on delete set null`. Quindi: scheda non
  reclamata, thread intatti, messaggi con «Account eliminato».
- Spariscono per cascata: profilo, email, follow, preferiti, notifiche, note
  private, richieste Pro. Le chiamate pubblicate vengono rimosse (sono annunci
  personali); le serate restano online.

## 13.4 — Rifiniture (fatto)

- `app/error.tsx` e `app/global-error.tsx`: niente più pagina bianca di Next.
- README con la sezione privacy/dati.

## Resta da fare

- Eventuale **revisione legale esterna** (esclusa per scelta): i testi sono
  coerenti con il funzionamento reale, ma non sostituiscono un parere.
- Conferma della **dicitura del titolare**.
- Rifiniture SEO minori, se emergono dai dati reali.
