/**
 * Testi legali.
 *
 * Restano in un file solo, in italiano e inglese: la pagina è la stessa, cambia
 * la lingua. Ogni affermazione descrive quello che il sito fa davvero (cookie
 * tecnici, statistiche aggregate, terze parti elencate). Se cambia una di queste
 * cose, cambia anche questo file.
 *
 * Titolare: persona fisica. La dicitura va confermata dal proprietario.
 */

export const LEGAL_CONTROLLER = "OpenStage — Francesco Sorrentino";
export const LEGAL_EMAIL = "ciao@getopenstage.it";
export const LEGAL_UPDATED = "31 ottobre 2026";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const privacyIt: LegalDocument = {
  title: "Privacy Policy",
  updated: LEGAL_UPDATED,
  intro:
    "Questa pagina spiega quali dati raccoglie OpenStage, perché, dove finiscono e come puoi farli cancellare. È scritta per essere letta, non per nascondere qualcosa.",
  sections: [
    {
      heading: "Titolare del trattamento",
      paragraphs: [
        `${LEGAL_CONTROLLER}, persona fisica, Italia. Per qualsiasi richiesta sui tuoi dati: ${LEGAL_EMAIL}.`,
        "OpenStage è un progetto gratuito: non vende dati, non profila gli utenti e non usa i tuoi dati per pubblicità.",
      ],
    },
    {
      heading: "Quali dati trattiamo",
      list: [
        "Account: email, password (gestita da Supabase, non la vediamo in chiaro), ruolo scelto (fan, artista, locale), nome e città se li inserisci.",
        "Scheda artista o locale: nome, città, indirizzo, capienza, bio, immagini, link social, dati EPK (foto, rider, contatto pubblico).",
        "Eventi: titolo, descrizione, data, luogo, prezzo, locandina. Sono dati pubblici, pubblicati da te.",
        "Contatti e booking: messaggi scambiati con l'altra parte, note private (visibili solo a chi le scrive) e promemoria.",
        "Dati tecnici: indirizzo IP e user agent arrivano ai nostri fornitori (hosting, database, CDN) per erogare il servizio e difenderlo dagli abusi. Non li conserviamo in un nostro archivio.",
        "Statistiche: conteggi aggregati per giorno e per scheda (visualizzazioni). Non contengono IP, cookie o identificativi: non è possibile risalire a chi ha aperto una pagina.",
      ],
    },
    {
      heading: "Perché li trattiamo",
      list: [
        "Per eseguire il servizio che hai chiesto: account, scheda, eventi, messaggi.",
        "Per obblighi di legge e per rispondere a richieste di autorità.",
        "Per sicurezza e antispam: verifica dei form, limiti di invio, protezione dagli abusi.",
        "Per il nostro legittimo interesse a capire se il servizio funziona, con statistiche aggregate e senza profilazione.",
      ],
    },
    {
      heading: "Cookie",
      paragraphs: [
        "Usiamo solo cookie tecnici: sessione di accesso, lingua scelta, ritorno dopo l'accesso con Google, preferenza del player. Nessun cookie pubblicitario, nessun tracciamento di terze parti al primo caricamento.",
        "Il player Spotify è un contenuto di terze parti: si attiva solo se premi «Attiva il player». Da quel momento Spotify può impostare cookie o storage propri, secondo la sua informativa.",
        "Il controllo di sicurezza dei form (Cloudflare Turnstile) è un servizio di terze parti necessario a proteggere il sito dagli abusi.",
        "Dettagli e durate sono nella Cookie Policy.",
      ],
    },
    {
      heading: "Chi tratta i dati per noi",
      list: [
        "Supabase — database e autenticazione.",
        "Vercel — hosting e log tecnici.",
        "Resend — invio delle email di servizio (conferma, reset password, avvisi).",
        "MapTiler / OpenFreeMap — mappe e tessere geografiche.",
        "Cloudflare — Turnstile, protezione dei form.",
        "Spotify — solo dopo l'attivazione del player.",
      ],
      paragraphs: [
        "Sono fornitori con server anche fuori dall'Unione Europea: il trasferimento avviene con le garanzie previste dai loro contratti (clausole contrattuali standard). Non vendiamo dati a nessuno.",
      ],
    },
    {
      heading: "Per quanto tempo",
      list: [
        "Account e scheda: finché l'account esiste.",
        "Notifiche in-app: 90 giorni, poi vengono eliminate.",
        "Messaggi, note e richieste di booking: finché l'account esiste; puoi cancellare le singole voci.",
        "Statistiche aggregate: senza scadenza, perché non contengono dati personali.",
        "Log dei fornitori: secondo le loro politiche tecniche di conservazione.",
        "Se cancelli l'account: i dati personali vengono rimossi subito; le serate pubblicate restano online senza legame con te e la scheda torna non reclamata.",
      ],
    },
    {
      heading: "I tuoi diritti",
      paragraphs: [
        `Puoi chiedere accesso, rettifica, cancellazione, portabilità, limitazione e opposizione scrivendo a ${LEGAL_EMAIL}. Dall'account puoi già scaricare i tuoi dati e cancellare l'account da solo.`,
        "Se pensi che il trattamento non sia corretto puoi rivolgerti al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
      ],
    },
    {
      heading: "Minori",
      paragraphs: [
        "OpenStage non è pensato per i minori di 14 anni. Se ti accorgi che un account appartiene a un minore, scrivici e lo rimuoviamo.",
      ],
    },
    {
      heading: "Sicurezza",
      paragraphs: [
        "HTTPS su tutto il sito, accessi al database regolati da policy per riga (Row Level Security), permessi minimi, 2FA per lo staff. Nessun sistema è invulnerabile: se scopri un problema, scrivici prima di pubblicarlo.",
      ],
    },
    {
      heading: "Modifiche",
      paragraphs: [
        `Se cambiamo qualcosa di sostanziale aggiorniamo questa pagina e la data in alto. Questa versione è del ${LEGAL_UPDATED}.`,
      ],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  updated: LEGAL_UPDATED,
  intro:
    "This page explains what OpenStage collects, why, where it goes and how you can have it deleted. It is written to be read, not to hide something.",
  sections: [
    {
      heading: "Data controller",
      paragraphs: [
        `${LEGAL_CONTROLLER}, natural person, Italy. For any request about your data: ${LEGAL_EMAIL}.`,
        "OpenStage is a free project: it does not sell data, does not profile users and does not use your data for advertising.",
      ],
    },
    {
      heading: "What we process",
      list: [
        "Account: email, password (managed by Supabase, we never see it in clear), chosen role (fan, artist, venue), name and city if you provide them.",
        "Artist or venue page: name, city, address, capacity, bio, images, social links, EPK data (photo, rider, public contact).",
        "Events: title, description, date, place, price, poster. These are public data you publish.",
        "Contacts and booking: messages exchanged with the other side, private notes (only visible to their author) and reminders.",
        "Technical data: IP address and user agent reach our providers (hosting, database, CDN) to run the service and defend it from abuse. We do not keep them in our own archive.",
        "Stats: aggregated daily counts per page (views). They contain no IP, cookie or identifier: it is impossible to trace who opened a page.",
      ],
    },
    {
      heading: "Why we process them",
      list: [
        "To run the service you asked for: account, page, events, messages.",
        "For legal obligations and to answer requests from authorities.",
        "For security and anti-spam: form checks, sending limits, abuse protection.",
        "For our legitimate interest in understanding whether the service works, with aggregated stats and no profiling.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "We only use technical cookies: login session, chosen language, return after Google sign-in, player preference. No advertising cookies, no third-party tracking on first load.",
        "The Spotify player is third-party content: it loads only if you press “Enable the player”. From that moment Spotify may set its own cookies or storage, under its own policy.",
        "The form security check (Cloudflare Turnstile) is a third-party service needed to protect the site from abuse.",
        "Details and durations are in the Cookie Policy.",
      ],
    },
    {
      heading: "Who processes data for us",
      list: [
        "Supabase — database and authentication.",
        "Vercel — hosting and technical logs.",
        "Resend — service emails (confirmation, password reset, alerts).",
        "MapTiler / OpenFreeMap — maps and geographic tiles.",
        "Cloudflare — Turnstile, form protection.",
        "Spotify — only after you enable the player.",
      ],
      paragraphs: [
        "These providers also run servers outside the European Union: transfers rely on the safeguards in their contracts (standard contractual clauses). We do not sell data to anyone.",
      ],
    },
    {
      heading: "How long",
      list: [
        "Account and page: as long as the account exists.",
        "In-app notifications: 90 days, then deleted.",
        "Messages, notes and booking requests: as long as the account exists; you can delete single items.",
        "Aggregated stats: no expiry, because they contain no personal data.",
        "Provider logs: according to their technical retention policies.",
        "If you delete your account: personal data is removed immediately; published dates stay online with no link to you and the page becomes unclaimed.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        `You can ask for access, rectification, erasure, portability, restriction and objection by writing to ${LEGAL_EMAIL}. From your account you can already download your data and delete the account yourself.`,
        "If you believe the processing is unlawful you can contact the Italian Data Protection Authority (www.garanteprivacy.it).",
      ],
    },
    {
      heading: "Minors",
      paragraphs: [
        "OpenStage is not intended for people under 14. If you notice an account belonging to a minor, write to us and we will remove it.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "HTTPS everywhere, database access governed by row-level policies, least privilege, 2FA for staff. No system is invulnerable: if you find a problem, tell us before publishing it.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        `If we change something substantial we update this page and the date above. This version is dated ${LEGAL_UPDATED}.`,
      ],
    },
  ],
};

const termsIt: LegalDocument = {
  title: "Termini di Servizio",
  updated: LEGAL_UPDATED,
  intro:
    "Le regole d'uso di OpenStage, scritte in italiano semplice. Usando il sito le accetti.",
  sections: [
    {
      heading: "Che cos'è OpenStage",
      paragraphs: [
        "Una piattaforma gratuita per scoprire eventi di musica dal vivo indipendente e per pubblicarli. Non vende biglietti, non gestisce pagamenti e non prende commissioni.",
        "Gli eventi sono organizzati da artisti e locali: la responsabilità dell'evento è di chi lo pubblica.",
      ],
      list: [
        "Il servizio è gratuito e non prevede abbonamenti.",
        "Non esiste visibilità a pagamento: ricerca, mappa e vetrina non si comprano.",
        "Il servizio può cambiare o essere sospeso: facciamo il possibile per tenerlo online, senza garanzie di continuità.",
      ],
    },
    {
      heading: "Account",
      list: [
        "Devi avere almeno 14 anni.",
        "I dati che inserisci devono essere veri e tuoi: non puoi usare l'identità di un altro artista o locale.",
        "Una scheda artista e una scheda locale per profilo.",
        "Sei responsabile delle credenziali e di quello che fai con il tuo account.",
        "Puoi cancellare l'account in qualsiasi momento dalle impostazioni.",
      ],
    },
    {
      heading: "Contenuti che pubblichi",
      paragraphs: [
        "I contenuti restano tuoi. Ci dai il permesso di mostrarli sul sito, nelle anteprime social, nella mappa e nei widget, per il tempo in cui restano pubblicati.",
      ],
      list: [
        "Devi avere i diritti su testi, foto e locandine che carichi.",
        "Pubblichi solo eventi reali, con un luogo e una data veri.",
        "Non pubblichi contenuti illegali, offensivi, discriminatori o spam.",
        "Non usi il sito per raccogliere dati di altre persone o per fare scraping.",
      ],
    },
    {
      heading: "Schede non reclamate",
      paragraphs: [
        "Alcune schede nascono dalla redazione partendo da eventi reali. Se la scheda è tua, puoi reclamarla con una prova pubblica; lo staff verifica prima di collegarla al tuo account.",
      ],
    },
    {
      heading: "Moderazione",
      list: [
        "Possiamo correggere, nascondere o rimuovere contenuti che violano queste regole.",
        "Possiamo sospendere un account in caso di abusi, spam o contenuti falsi.",
        "Le serate annullate restano visibili con il motivo: è un'informazione utile a chi le aveva salvate.",
        "Per contestare una decisione puoi scrivere a " + LEGAL_EMAIL + ".",
      ],
    },
    {
      heading: "Cancellazione dell'account",
      paragraphs: [
        "Quando cancelli l'account rimuoviamo i tuoi dati personali. Le serate pubblicate restano online senza legame con te e la scheda torna non reclamata. Nelle conversazioni dell'altra parte il tuo nome viene sostituito con «Account eliminato».",
      ],
    },
    {
      heading: "Responsabilità",
      paragraphs: [
        "Il servizio è offerto così com'è. Non garantiamo che un evento si svolga, che un locale sia aperto o che un artista si presenti: queste informazioni le pubblicano gli organizzatori.",
        "Non siamo responsabili dei link esterni (biglietti, mappe, social) né dei contenuti pubblicati dagli utenti. Nei limiti di legge, la nostra responsabilità è esclusa.",
      ],
    },
    {
      heading: "Segnalazioni",
      paragraphs: [
        "Se un contenuto viola un tuo diritto puoi usare la pagina Notice & takedown o scrivere a " + LEGAL_EMAIL + ". Le richieste vengono lette da una persona.",
      ],
    },
    {
      heading: "Legge e foro",
      paragraphs: [
        "Si applica la legge italiana. Per le controversie è competente il foro del titolare, salvo i diritti inderogabili dei consumatori.",
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: "Terms of Service",
  updated: LEGAL_UPDATED,
  intro: "The rules for using OpenStage, in plain language. By using the site you accept them.",
  sections: [
    {
      heading: "What OpenStage is",
      paragraphs: [
        "A free platform to discover independent live music events and to publish them. It does not sell tickets, does not handle payments and takes no commission.",
        "Events are organised by artists and venues: responsibility for an event lies with whoever publishes it.",
      ],
      list: [
        "The service is free and has no subscriptions.",
        "There is no paid visibility: search, map and showcase are not for sale.",
        "The service may change or be suspended: we do our best to keep it online, with no continuity guarantee.",
      ],
    },
    {
      heading: "Account",
      list: [
        "You must be at least 14 years old.",
        "The data you enter must be true and yours: you cannot use someone else's identity.",
        "One artist page and one venue page per profile.",
        "You are responsible for your credentials and for what you do with your account.",
        "You can delete your account at any time from the settings.",
      ],
    },
    {
      heading: "Content you publish",
      paragraphs: [
        "Content stays yours. You give us permission to show it on the site, in social previews, on the map and in widgets, for as long as it stays published.",
      ],
      list: [
        "You must own the rights to texts, photos and posters you upload.",
        "Publish real events only, with a real place and a real date.",
        "Do not publish illegal, offensive, discriminatory content or spam.",
        "Do not use the site to collect other people's data or to scrape.",
      ],
    },
    {
      heading: "Unclaimed pages",
      paragraphs: [
        "Some pages are created by the editors from real events. If the page is yours you can claim it with public proof; staff verify it before linking it to your account.",
      ],
    },
    {
      heading: "Moderation",
      list: [
        "We may correct, hide or remove content that breaks these rules.",
        "We may suspend an account for abuse, spam or fake content.",
        "Cancelled dates stay visible with the reason: it is useful to whoever saved them.",
        "To appeal a decision write to " + LEGAL_EMAIL + ".",
      ],
    },
    {
      heading: "Account deletion",
      paragraphs: [
        "When you delete your account we remove your personal data. Published dates stay online with no link to you and the page becomes unclaimed. In the other side's conversations your name is replaced with “Deleted account”.",
      ],
    },
    {
      heading: "Liability",
      paragraphs: [
        "The service is provided as is. We do not guarantee that an event takes place, that a venue is open or that an artist shows up: organisers publish that information.",
        "We are not responsible for external links (tickets, maps, socials) or for content published by users. To the extent permitted by law, our liability is excluded.",
      ],
    },
    {
      heading: "Reports",
      paragraphs: [
        "If content infringes your rights you can use the Notice & takedown page or write to " + LEGAL_EMAIL + ". Requests are read by a person.",
      ],
    },
    {
      heading: "Law and jurisdiction",
      paragraphs: [
        "Italian law applies. The court of the controller has jurisdiction, without prejudice to mandatory consumer rights.",
      ],
    },
  ],
};

const cookiesIt: LegalDocument = {
  title: "Cookie Policy",
  updated: LEGAL_UPDATED,
  intro:
    "OpenStage usa solo cookie tecnici. Non trovi cookie pubblicitari, pixel di tracciamento o profilazione.",
  sections: [
    {
      heading: "Cosa sono i cookie",
      paragraphs: [
        "Piccoli file che il browser salva per far funzionare un sito: ricordare l'accesso, la lingua, una preferenza. Non sono programmi e non leggono i tuoi file.",
      ],
    },
    {
      heading: "Quali usiamo",
      list: [
        "Sessione di accesso (Supabase): tiene l'utente collegato. Necessario. Durata: la sessione, con rinnovo.",
        "Lingua (openstage_locale): ricorda italiano o inglese. Necessario. Durata: un anno.",
        "Ritorno dopo Google (openstage_oauth_next): riporta alla pagina giusta dopo l'accesso. Necessario. Durata: 10 minuti.",
        "Preferenza del player (openstage:spotify-enabled, in localStorage): ricorda se hai attivato il player. Necessario. Resta finché non svuoti i dati del browser.",
      ],
    },
    {
      heading: "Contenuti di terze parti",
      paragraphs: [
        "Il player Spotify si carica solo dopo che premi «Attiva il player». Da quel momento Spotify può impostare cookie o storage propri: vale la sua informativa, non la nostra.",
        "La verifica di sicurezza dei form (Cloudflare Turnstile) carica uno script quando invii un modulo: serve a distinguere persone da bot e non profila la navigazione.",
        "Le mappe caricano tessere da MapTiler/OpenFreeMap: la richiesta contiene il tuo IP, come qualsiasi richiesta a un server.",
      ],
    },
    {
      heading: "Consenso",
      paragraphs: [
        "I cookie tecnici non richiedono consenso. Non avendo cookie di profilazione, non trovi un banner: se in futuro ne introdurremo, chiederemo prima il consenso e potrai rifiutarlo.",
      ],
    },
    {
      heading: "Come li gestisci",
      paragraphs: [
        "Puoi cancellare cookie e dati locali dalle impostazioni del browser. Se blocchi i cookie di sessione non potrai accedere al tuo account.",
      ],
    },
  ],
};

const cookiesEn: LegalDocument = {
  title: "Cookie Policy",
  updated: LEGAL_UPDATED,
  intro: "OpenStage only uses technical cookies. There are no advertising cookies, tracking pixels or profiling.",
  sections: [
    {
      heading: "What cookies are",
      paragraphs: [
        "Small files the browser saves to make a site work: remember the login, the language, a preference. They are not programs and cannot read your files.",
      ],
    },
    {
      heading: "Which ones we use",
      list: [
        "Login session (Supabase): keeps you signed in. Necessary. Duration: the session, with renewal.",
        "Language (openstage_locale): remembers Italian or English. Necessary. Duration: one year.",
        "Return after Google (openstage_oauth_next): takes you back to the right page after sign-in. Necessary. Duration: 10 minutes.",
        "Player preference (openstage:spotify-enabled, in localStorage): remembers whether you enabled the player. Necessary. Stays until you clear browser data.",
      ],
    },
    {
      heading: "Third-party content",
      paragraphs: [
        "The Spotify player loads only after you press “Enable the player”. From that moment Spotify may set its own cookies or storage: its policy applies, not ours.",
        "The form security check (Cloudflare Turnstile) loads a script when you submit a form: it tells people from bots and does not profile browsing.",
        "Maps load tiles from MapTiler/OpenFreeMap: the request contains your IP, like any request to a server.",
      ],
    },
    {
      heading: "Consent",
      paragraphs: [
        "Technical cookies need no consent. Since there are no profiling cookies, there is no banner: if we ever add them, we will ask first and you will be able to refuse.",
      ],
    },
    {
      heading: "Managing them",
      paragraphs: [
        "You can clear cookies and local data in your browser settings. If you block session cookies you will not be able to sign in.",
      ],
    },
  ],
};

export const LEGAL = {
  privacy: { it: privacyIt, en: privacyEn },
  terms: { it: termsIt, en: termsEn },
  cookies: { it: cookiesIt, en: cookiesEn },
} as const;
