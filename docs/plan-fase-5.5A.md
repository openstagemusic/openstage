# Fase 5.5A — Login, registrazione, account e onboarding

> **Stato: completata il 23 ottobre 2026, build verde.** Blocco visivo della Fase 5.5.
> Nessuna nuova funzione, nessun dato finto, nessun servizio esterno. I test con account
> reali restano da fare in produzione.
> Riferimenti: `docs/design-system.md` §12, `AGENTS.md`, Home 5.4.

## Obiettivo

Riportare login, registrazione, account e onboarding al linguaggio della Home 5.4:
titolo-poster, etichette mono, righe e bordi, meno card glass generiche. La logica
resta quella attuale: Supabase, RLS, form reali, Google e Turnstile.

## Cosa entra

### 5.5A.1 — Login

- Pagina a due tempi: colonna editoriale + pannello form.
- Titolo-poster, sottotitolo breve, tre valori reali del prodotto (gratis per
  sempre, niente pay-to-play, eventi e luoghi reali).
- Form con label mono, input alti, focus ciano, errore testuale.
- Google come azione secondaria.
- Link a registrazione e, nella 7A, a “Password dimenticata?”.
- Nessuna modifica al flusso di accesso.

### 5.5A.2 — Registrazione

- Stessa struttura del login, con titolo e copy dedicati.
- Ruolo fan/artista/locale: resta il select attuale, ma con stile coerente.
- Turnstile resta parte del form.
- Messaggi “controlla la tua email” e “email già registrata” restano invariati.
- Nessuna conferma email: arriva nella 7A.

### 5.5A.3 — Account

- Testata editoriale con etichetta mono, titolo-poster, email e ruolo.
- Sezioni separate da `border-line`, non una pila di card glass.
- Scheda artista/locale come blocco principale: stato verifica, link pubblico,
  form dati.
- Pannelli admin/fan sobri, con link esistenti.
- Richiesta di claim in attesa con lo stesso linguaggio.
- Nessuna nuova funzione, nessuna cancellazione account (B07).

### 5.5A.4 — Onboarding

- **Ruolo**: tre opzioni grandi, con numero mono, titolo e descrizione; quella
  selezionata usa bordo viola e fondo viola tenue.
- **Artista/locale**: testata editoriale, ricerca della scheda prima della
  creazione, form con campi coerenti.
- I redirect e i controlli di ruolo restano quelli attuali.
- La creazione della scheda resta invariata.

## File previsti

- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/account/page.tsx`
- `app/onboarding/role/page.tsx`
- `app/onboarding/artist/page.tsx`
- `app/onboarding/venue/page.tsx`
- `components/auth/AuthShell.tsx` (nuovo, solo presentazione)
- `components/auth/formStyles.ts` (nuovo, classi condivise)
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/auth/GoogleButton.tsx`
- `components/auth/RolePicker.tsx`
- `components/auth/OnboardingForm.tsx`
- `components/auth/VenueOnboardingForm.tsx`
- `components/account/AccountForm.tsx`
- `components/claims/PageSearch.tsx` (solo stile)
- `components/claims/PendingRequestPanel.tsx` (solo stile)
- `i18n/dictionaries/it.ts`
- `i18n/dictionaries/en.ts`

Nessun altro file. Nessuna migration, nessuna env nuova.

## Design

- Fondo `bg`, pannelli `surface` con bordo `line`; niente glass dietro a testi
  lunghi.
- Titoli in Anton, corpo in Inter, etichette in IBM Plex Mono.
- Pulsante primario viola pieno; secondario con bordo; niente gradienti sui
  pulsanti.
- Input: `border-line`, fondo trasparente o `surface`, focus ciano, raggio
  coerente (squadrato o pill, non entrambi nella stessa pagina).
- Errore in rosa, sempre con testo; nessun colore da solo.
- Mobile first: 320 px senza overflow; form sopra la piega quando possibile.
- Nessuna immagine di repertorio, nessun contatore, nessuna statistica.

## QA

- [ ] Login con email/password reale funziona.
- [ ] Login con Google funziona.
- [ ] Registrazione fan, artista, locale funziona.
- [ ] Turnstile non blocca un utente normale.
- [ ] Account: modifica artista e locale, link pubblico, stato verifica.
- [ ] Richiesta di claim in attesa: visualizzazione e ritiro.
- [ ] Onboarding ruolo: fan → artista/locale, blocco del ruolo già scelto.
- [ ] Onboarding artista/locale: ricerca scheda, creazione, redirect.
- [ ] Italiano e inglese su tutte le stringhe nuove.
- [ ] 320, 390, 768 e 1280 px senza overflow.
- [ ] Focus da tastiera visibile su tutti i campi e pulsanti.
- [ ] `npm run build` verde.
- [ ] Nessuna modifica a Supabase, RLS o dati.

## Criterio di chiusura

La 5.5A è chiusa quando login, registrazione, account e onboarding usano lo
stesso linguaggio della Home 5.4, tutte le funzioni esistenti sono intatte,
la build è verde e il commit è **“Fase 5.5A”**.
