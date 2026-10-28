# Fase 9A - Follow di artisti e locali

> **Stato: 9A fatta il 28 ottobre 2026.** 9B (inviti virali) resta rimandata.
> **Inviti virali: rimandati.** Senza un premio chiaro e regole anti-abuso non
> portano valore; non entrano in questo blocco.

## Obiettivo

Permettere a fan, artisti e locali di seguire una scheda pubblica e ricevere una
notifica quando quella scheda pubblica una nuova serata. Nessuna classifica di
popolarità, nessun engagement finto.

## Cosa entra

- Tabella `follows`: profilo + artista **oppure** locale, con RLS sulla propria
  riga e divieto di seguire la propria scheda.
- Pulsante **Segui / Segui già** sulle schede pubbliche di artista e locale.
  Da scollegati porta al login.
- Notifica **in-app** `follow_new_event` quando un artista/locale seguito
  pubblica un evento futuro. Rispetta la preferenza `in_app_follows`.
- Integrazione nel **digest settimanale** già esistente: oltre alle serate
  salvate, include quelle degli artisti/locali seguiti, senza duplicati.
- Sezione **"Artisti e locali che segui"** in `/dashboard/per-te`.
- **Conteggio pubblico dei follower** accanto al pulsante, sulla sola scheda:
  numero reale calcolato dal database con la funzione `follow_count`, visibile
  anche da scollegati, nascosto quando è zero. Nessuna classifica e nessuna
  lista di chi segue.
- Testi IT/EN nei dizionari.

## Cosa non entra

- Inviti virali, codici `/invite/CODICE`, premi e riscatto.
- Classifiche di popolarità, ordinamento per follower, lista pubblica dei
  follower.
- Follow via email, notifica per ogni singolo follow.
- Follow di eventi o città: solo schede artista/locale.

## Servizi esterni e ambiente

- **Nessun servizio nuovo**: Supabase (tabella/RLS/trigger), Resend (digest già
  configurato), Vercel (deploy), GitHub.
- **Nessuna nuova variabile** in `.env.local` o su Vercel.
- Git identity attuale: `Francesco` / `ceskobeatzmusic@gmail.com`.

## QA

- [x] Follow e unfollow da scheda artista e locale, con stato persistente.
- [x] Da scollegati il pulsante porta al login, senza errori.
- [x] Impossibile seguire la propria scheda.
- [x] La notifica in-app arriva ai follower quando l'evento viene pubblicato e
      rispetta `in_app_follows`.
- [x] Il digest include le serate delle schede seguite senza duplicare quelle
      salvate.
- [x] Il conteggio dei follower compare solo se maggiore di zero, anche da
      scollegati, e si aggiorna subito dopo follow/unfollow.
- [x] `/dashboard/per-te` mostra le schede seguite.
- [x] Build, test reale, deploy e commit.
