# Review Fase 1.3 — Ruoli definitivi

> Review di fine fase. Serve a tenere traccia di giudizi, suggerimenti e debito tecnico da
> riprendere. Le voci "da riprendere" sono raccolte anche in `docs/backlog.md`.

## Cosa funziona

- **La regola dei ruoli è nel database, non nell'interfaccia.** Un fan che chiama l'API a mano
  viene respinto (errore `42501`) quando prova a crearsi una riga artista o a pubblicare un
  evento: è la differenza tra "non vedo il pulsante" e "non posso farlo".
- **Il "solo una volta" non ha bisogno di contatori**: l'unica transizione ammessa è
  `fan → artista | locale`, e dopo non sei più fan. Meno stato da mantenere, meno modi di
  sbagliare.
- **Le pagine non mentono**: `/onboarding/role` per un artista mostra "Il tuo ruolo è già
  attivo" invece di un modulo che il database rifiuterebbe; il pulsante di scelta rilegge il
  ruolo salvato e mostra un errore se non è cambiato.
- **Il ruolo si vede e serve**: badge colorato e link contestuale in navbar, così il fan trova
  la strada per diventare artista/locale senza doverla cercare.
- Correzione di un **difetto latente dalla Fase 1** (il ruolo `admin` dello staff non veniva
  mai assegnato) e di un **testo falso** ("potrai cambiarlo quando vuoi").

## Allineamento ai valori di OpenStage

| Valore | Come si vede in questa fase |
| --- | --- |
| Underground e indipendente | Un fan può diventare artista con un clic: la porta verso la visibilità non ha barriere né costi |
| Gratis per sempre | Nessuna funzione riservata a piani a pagamento: le regole sui ruoli esistono per la coerenza della community, non per vendere upgrade |
| Autenticità | I profili non cambiano identità: chi pubblica eventi resta lo stesso profilo, quindi la fiducia non è eludibile |
| UX senza attrito | Il ruolo è sempre visibile in navbar e l'azione utile è a un clic, senza menu nascosti |

## Tre suggerimenti

1. **Un piccolo avviso al momento della scelta (già inserito, da valutare a video).** Un testo
   che spiega il blocco è utile, ma su una scelta irreversibile vale la pena valutare un
   passaggio di conferma esplicito ("Sei sicuro? Non potrai più cambiare ruolo"). È la classica
   situazione in cui un clic in più evita una richiesta di assistenza.
2. **Portare il blocco dove arriveranno i nuovi dati.** Le regole ora coprono artisti, locali
   ed eventi. Quando nasceranno preferiti, follower e richieste di contatto, ogni nuova tabella
   dovrà nascere con la RLS che chiede il ruolo coerente: meglio scriverlo nel piano di fase
   **prima** di scrivere le query, così non si torna indietro.
3. **Un test automatico sul flusso dei ruoli.** Oggi ogni verifica è fatta a mano con SQL e
   browser: funziona, ma è il tipo di regola che non si deve poter rompere per sbaglio. Un test
   end-to-end (Playwright) su "fan → artista, poi bloccato" è il primo candidato quando
   introdurremo i test automatici.

## Rischi e debito tecnico

| Voce | Gravità | Nota |
| --- | --- | --- |
| Nessun test automatico | Media | Le regole critiche (ruoli, RLS) sono verificate a mano a ogni fase: va bene ora, non regge a lungo |
| Codice di protezione duplicato nelle pagine | Bassa | Le guardie (`canManageEvents`, `canManageArtistProfile`) sono centralizzate in `lib/auth/roles.ts`, ma ogni pagina nuova deve ricordarsi di applicarle: la RLS resta la rete di sicurezza |
| Ruolo definitivo senza data di scelta | Bassa | Non registriamo *quando* un fan è diventato artista: utile per le metriche "autentiche" e per l'assistenza. Basterebbe una colonna `role_chosen_at` |
| `npm audit` con 7 segnalazioni su dipendenze di sviluppo/build | Bassa | Arrivano da `eslint-config-next` (braces/micromatch) e da `next` → `postcss`: serve un salto di versione maggiore, da pianificare, non da fare di corsa |

## Da riprendere alla fine delle nove fasi

Sono finiti in `docs/backlog.md`, in sintesi: attivazione della protezione password
compromesse, revoca dei token di servizio, test automatici sui flussi critici, colonna
`role_chosen_at`, cancellazione account (privacy), immagine di anteprima social.

## Verifiche eseguite

- Artista → locale / fan / admin: **annullati**; locale → fan: **annullato**.
- Fan → artista e fan → locale: **riusciti**, e da quel momento **bloccati**.
- Fan che crea una riga `artists` o un evento via API: **negato (42501)**.
- Artista che crea la propria riga e un evento: **consentito**.
- Correzione del ruolo da parte dell'admin: **possibile**.
- Storico migrazioni allineato (`0001`…`0004`); avvisi di sicurezza invariati; `npm run build`
  verde; pagine di produzione raggiungibili e percorsi protetti reindirizzati al login.
