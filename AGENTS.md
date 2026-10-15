# OpenStage - project rules (read this file at the start of every task)

Product: OpenStage, una piattaforma globale per scoprire eventi di musica dal vivo, focalizzata su artisti indipendenti e locali/venue.

Filosofia & Valori Fondamentali (OGNI DECISIONE DEVE ALLINEARSI A QUESTI PUNTI):
1. Supporto per la musica Underground e Indipendente: OpenStage esiste per dare visibilità reale agli artisti emergenti e ai locali di zona che non possono permettersi le grandi piattaforme commerciali.
2. Etica ed Accessibilità Prima di Tutto: Gratuito per sempre per fan, artisti e locali (piano base). Nessun paywall aggressivo, nessuna trappola in abbonamento, nessun algoritmo "pay-to-play".
3. Autenticità prima dell'Hype: Eventi reali, luoghi reali, connessioni reali con la community. Niente metriche vanitose o engagement finto.
4. UX Senza Attrito: Estetica dark cyber-neon pulita, veloce, ad alto impatto. Scoprire il concerto di stasera deve essere facile come aprire una mappa.

Lingua, Localizzazione e Comunicazione con l'Agente:
- TUTTA LA COMUNICAZIONE E I PROMPT SONO IN ITALIANO. L'agente deve rispondere, pianificare e spiegare sempre in lingua italiana.
- La lingua principale della piattaforma per l'utente è l'Italiano (it), con un selettore Inglese (en) nell'interfaccia.
- Rilevamento automatico basato su geolocalizzazione/IP dell'utente: se si trova in Italia parte in Italiano; se è fuori dall'Italia parte in Inglese.
- Tutti i testi dell'interfaccia devono essere salvati in file di dizionario/i18n modulari.

Politica Zero Dati Finti (No Mock Data) e Test su Vercel:
- Non usare mai dati finti o hardcodati per le funzionalità principali. Ogni fase si collega a database reali, Auth reale e API reali fin dal primo giorno.
- OGNI FASE DEVE ESSERE TESTABILE IN PRODUZIONE: Alla fine di ogni fase il codice deve superare la build ed essere pronto per il deploy continuo su Vercel (tramite GitHub).

Integrazioni, Guida e Consulenza Critica sugli Strumenti:
- Prima di integrare qualsiasi servizio esterno (Database, Auth, Email, Mappe, Pagamenti), l'agente DEVE fermarsi prima di costruire.
- L'agente deve guidare l'utente passo-passo nella configurazione e nel recupero delle chiavi API.
- COSTRUZIONE CRITICA DELLO STACK: Se per una determinata esigenza (es. Supabase, Resend, PayPal) l'agente ritiene esista un'alternativa migliore (più spazio free, costi inferiori, maggiore scalabilità o semplicità), DEVE proporre il confronto all'utente con pro e contro PRIMA di iniziare a scrivere codice.

Stack di Riferimento Iniziale: 
Next.js (App Router, TypeScript) con Server-Side Rendering (SSR) su tutte le pagine pubbliche; Supabase (Auth, Postgres con Row Level Security su ogni tabella); Tailwind CSS; Framer Motion; MapLibre GL JS con MapTiler; Resend per le email; Cloudflare Turnstile; PayPal per i pagamenti; Deploy e Hosting su Vercel con repository GitHub. Mai SPA solo client: SEO e preview social devono funzionare ovunque.

Design:
Dark cyber-neon con glassmorphism. Sfondo #07070D, pannelli glass (backdrop-blur, bordo traslucido 1px), accenti viola #8B5CF6, ciano #22D3EE, rosa #F472B6. Font: Space Grotesk per i titoli, Inter per il corpo. Bento grid, parallax hero, scroll-reveal, card con effetto 3D tilt/glow. Glass solo su navbar, card e pop-up—mai dietro a testi lunghi. Mobile first.

Navigazione:
- Navbar Pubblica: Logo, Esplora (Home/Mappa), Artisti (/artisti), Locali (/locali), Per gli Artisti (/per-gli-artisti), Per i Locali (/per-le-venue), Chi siamo (/about), Switcher Lingua (IT/EN), Accedi / Registrati.
- Footer Pubblico: Chi siamo, Contatti, Privacy Policy, Termini di Servizio, Cookie Policy, Playlist Spotify, Social.
- Persistent Sticky Player: Player Spotify fisso in basso per l'ascolto in background, posizionato sopra la navigazione mobile.

Regole Operative e Consultazione Pre-Costruzione:
1. Prima di scrivere codice per qualsiasi fase, crea un piano breve in docs/plan-phase-N.md.
2. FASE OBBLIGATORIA DI PARERE CRITICO: Prima di costruire, fornisci in chat le tue opinioni da esperto, suggerimenti strategici, eventuali confronti sugli strumenti da integrare e verifica dell'allineamento con la filosofia di OpenStage.
3. Se ci sono servizi esterni o variabili su Vercel/GitHub da configurare, avvisa l'utente e forniscigli le istruzioni chiare su come procedere.
4. Modifica solo i file strettamente necessari; non rileggere l'intero repository; niente refactoring extra non richiesti.
5. Alla fine esegui la build locale (`npm run build`), risolvi eventuali errori, crea un commit Git chiamato "Fase N" e rispondi con un riepilogo in 5 righe: cosa testare, quali env vars impostare su Vercel, quale SQL eseguire.
