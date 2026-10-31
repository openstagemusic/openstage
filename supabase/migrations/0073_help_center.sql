-- ============================================================================
-- OpenStage - Fase 14 (Help Center)
-- Categorie, articoli in Markdown IT/EN e feedback "utile / non utile".
-- Lettura pubblica solo per gli articoli pubblicati; scrittura solo admin.
--
-- Idempotente.
-- ============================================================================

create extension if not exists pg_trgm;

create table if not exists public.help_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_it text not null,
  name_en text,
  description_it text,
  description_en text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.help_categories (id) on delete set null,
  slug text not null unique,
  title_it text not null,
  title_en text,
  body_it text not null,
  body_en text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists help_articles_category_idx
  on public.help_articles (category_id, position);
create index if not exists help_articles_status_idx
  on public.help_articles (status, position);
create index if not exists help_articles_title_trgm
  on public.help_articles using gin (title_it gin_trgm_ops);
create index if not exists help_articles_body_trgm
  on public.help_articles using gin (body_it gin_trgm_ops);

create table if not exists public.help_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.help_articles (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists help_feedback_article_idx
  on public.help_feedback (article_id, created_at desc);

alter table public.help_categories enable row level security;
alter table public.help_articles enable row level security;
alter table public.help_feedback enable row level security;

-- Categorie: leggibili da tutti, scritte solo dallo staff.
drop policy if exists help_categories_read on public.help_categories;
create policy help_categories_read on public.help_categories
  for select to anon, authenticated using (true);

drop policy if exists help_categories_admin_write on public.help_categories;
create policy help_categories_admin_write on public.help_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Articoli: il pubblico vede solo i pubblicati; l'admin vede tutto.
drop policy if exists help_articles_read on public.help_articles;
create policy help_articles_read on public.help_articles
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists help_articles_admin_write on public.help_articles;
create policy help_articles_admin_write on public.help_articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Feedback: chiunque può dire se un articolo è stato utile, una volta per clic.
drop policy if exists help_feedback_insert_public on public.help_feedback;
create policy help_feedback_insert_public on public.help_feedback
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.help_articles a
      where a.id = help_feedback.article_id and a.status = 'published'
    )
  );

drop policy if exists help_feedback_admin_read on public.help_feedback;
create policy help_feedback_admin_read on public.help_feedback
  for select to authenticated using (public.is_admin());

drop trigger if exists help_categories_touch on public.help_categories;
create trigger help_categories_touch
  before update on public.help_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists help_articles_touch on public.help_articles;
create trigger help_articles_touch
  before update on public.help_articles
  for each row execute function public.touch_updated_at();

-- Seed categorie (idempotente per slug)
insert into public.help_categories (slug, name_it, name_en, description_it, description_en, position) values
  ('primi-passi', 'Primi passi', 'Getting started', 'Cos''è OpenStage e da dove iniziare.', 'What OpenStage is and where to start.', 1),
  ('account', 'Account e accesso', 'Account and sign-in', 'Registrazione, accesso, ruoli e impostazioni.', 'Sign-up, sign-in, roles and settings.', 2),
  ('fan', 'Fan, preferiti e notifiche', 'Fans, favourites and notifications', 'Seguire, salvare, ricevere avvisi.', 'Follow, save, receive alerts.', 3),
  ('artisti', 'Artisti', 'Artists', 'Scheda, EPK, date e strumenti.', 'Page, EPK, dates and tools.', 4),
  ('locali', 'Locali', 'Venues', 'Programmazione, chiamate e chiusura.', 'Programme, calls and closing.', 5),
  ('eventi', 'Eventi', 'Events', 'Pubblicare, modificare, annullare, festival.', 'Publish, edit, cancel, festivals.', 6),
  ('claim', 'Claim e verifica', 'Claims and verification', 'Reclamare una scheda e farsi verificare.', 'Claim a page and get verified.', 7),
  ('privacy', 'Privacy e sicurezza', 'Privacy and security', 'Dati, cookie, cancellazione ed export.', 'Data, cookies, deletion and export.', 8),
  ('segnalazioni', 'Segnalazioni', 'Reports', 'Segnalare un evento o un contenuto.', 'Report an event or content.', 9),
  ('problemi', 'Problemi tecnici', 'Technical issues', 'Se qualcosa non funziona.', 'If something does not work.', 10)
on conflict (slug) do nothing;

-- Articoli iniziali: contenuti reali, scritti su quello che il sito fa davvero.
insert into public.help_articles (category_id, slug, title_it, title_en, body_it, body_en, status, position, published_at)
select c.id, v.slug, v.title_it, v.title_en, v.body_it, v.body_en, 'published', v.position, now()
from (values
  ('primi-passi', 'come-funziona-openstage',
   'Come funziona OpenStage',
   'How OpenStage works',
   E'OpenStage è la mappa gratuita del live indipendente: artisti emergenti, locali di zona e serate vere.\n\n## Da dove iniziare\n\n- Apri la **mappa** per vedere cosa succede vicino a te.\n- Usa l''**agenda** in Home e filtra per città, data o ingresso gratuito.\n- Apri una scheda per leggere orari, indirizzo e indicazioni.\n\nNon serve un account per cercare. L''account serve per salvare le serate, seguire artisti e locali, ricevere notifiche, reclamare una scheda o pubblicare una data.\n\n## Cosa non trovi\n\nOpenStage non vende biglietti, non prende commissioni e non mette in vendita la visibilità. Se una serata ha un link ai biglietti, ti porta dove si compra.',
   E'OpenStage is the free map of independent live music: emerging artists, neighbourhood venues and real nights.\n\n## Where to start\n\n- Open the **map** to see what is happening near you.\n- Use the **agenda** on the Home and filter by city, date or free entry.\n- Open a page to read times, address and directions.\n\nYou do not need an account to search. An account lets you save nights, follow artists and venues, receive notifications, claim a page or publish a date.\n\n## What you will not find\n\nOpenStage does not sell tickets, takes no commission and does not sell visibility. If a night has a ticket link, it takes you where tickets are sold.',
   1),
  ('claim', 'reclamare-una-scheda',
   'Reclamare la scheda di un artista o di un locale',
   'Claim an artist or venue page',
   E'Se la tua scheda esiste già (magari creata dalla redazione da un concerto reale) puoi reclamarla e amministrarla.\n\n## Come si fa\n\n1. Apri la scheda e scegli **“Sono io”** per un artista o **“Sono il gestore”** per un locale.\n2. Inserisci un link pubblico che dimostri che la pagina è tua: sito, pagina social o pagina stampa con il tuo nome.\n3. Il claim dell''artista è immediato; la richiesta del locale viene approvata dallo staff.\n\n## Cosa succede dopo\n\nLa scheda si collega al tuo account e diventa modificabile dall''area personale. Se un locale non ha reclamato la pagina, i contatti restano spenti: nessuno riceve richieste a vuoto.\n\nHai ricevuto un invito via email? Il link è monouso e scade dopo 7 giorni.',
   E'If your page already exists (maybe created by the editors from a real gig) you can claim it and manage it.\n\n## How it works\n\n1. Open the page and choose **“This is me”** for an artist or **“I manage this venue”** for a venue.\n2. Add a public link that proves the page is yours: website, social page or press page with your name.\n3. Artist claims are immediate; venue requests are approved by staff.\n\n## What happens next\n\nThe page is linked to your account and becomes editable from your dashboard. If a venue has not claimed its page, contact is disabled: nobody receives requests into the void.\n\nDid you get an email invite? The link is single-use and expires after 7 days.',
   2),
  ('eventi', 'pubblicare-una-serata',
   'Pubblicare una serata',
   'Publish a night',
   E'Artisti e locali possono pubblicare date dalla dashboard.\n\n## Cosa serve\n\n- Titolo, tipo di evento e genere (facoltativo).\n- Data, ora e fuso orario del locale.\n- Luogo: un locale su OpenStage oppure nome, città e posizione sulla mappa.\n- Locandina (facoltativa) e informazioni su ingresso e biglietti.\n\n## Bozza, pubblicazione, annullamento\n\nPuoi salvare una **bozza** e pubblicarla quando è tutto pronto. Se la serata salta, **annulla** invece di cancellare: la pagina resta raggiungibile con il motivo, e chi l''aveva salvata lo legge.\n\nLe serate passate restano online come archivio della scheda.',
   E'Artists and venues can publish dates from the dashboard.\n\n## What you need\n\n- Title, event kind and genre (optional).\n- Date, time and the venue timezone.\n- Place: a venue on OpenStage or name, city and map pin.\n- Poster (optional) and entry or ticket information.\n\n## Draft, publish, cancel\n\nYou can save a **draft** and publish it when everything is ready. If the night falls through, **cancel** instead of deleting: the page stays reachable with the reason, and whoever saved it reads why.\n\nPast nights stay online as the archive of the page.',
   1),
  ('artisti', 'preparare-l-epk',
   'Preparare l''EPK',
   'Prepare your EPK',
   E'L''EPK è il press kit che mandi a locali e festival: foto, bio, rider, contatto e prossime date.\n\n## Dove si compila\n\nAccount → **EPK / press kit**. Puoi caricare una foto, scrivere un contatto pubblico e il rider tecnico. Bio, generi, link e date arrivano dalla scheda.\n\n## Come si usa\n\nLa pagina è `/artisti/<slug>/epk`, condivisibile e **stampabile**: in stampa spariscono navbar, footer e player, con testo nero su bianco. I link diventano indirizzi completi e cliccabili anche nel PDF.\n\nL''EPK non è indicizzato dai motori: la pagina canonica resta la scheda artista.',
   E'The EPK is the press kit you send to venues and festivals: photo, bio, rider, contact and upcoming dates.\n\n## Where to fill it in\n\nAccount → **EPK / press kit**. Upload a photo, write a public contact and your technical rider. Bio, genres, links and dates come from your page.\n\n## How to use it\n\nThe page is `/artisti/<slug>/epk`, shareable and **printable**: printing hides navbar, footer and player, with black text on white. Links become full, clickable addresses even in the PDF.\n\nThe EPK is not indexed by search engines: the artist page stays canonical.',
   1),
  ('locali', 'chiamate-e-candidature',
   'Bacheca ingaggi: pubblicare una chiamata',
   'Booking board: post a call',
   E'La bacheca serve a cercare una band, un DJ o un tecnico per una data o un periodo.\n\n## Chi può pubblicare\n\nSolo schede **reclamate e verificate**. Una chiamata aperta per scheda.\n\n## Cosa dichiarare\n\nRuolo cercato, città, periodo, compenso e una descrizione. Il compenso è obbligatorio: se non è retribuito, va detto.\n\n## Il tetto di candidature\n\nScegli quante richieste ricevere (da 1 a 50). Puoi cambiarlo anche a chiamata aperta. Quando hai trovato la persona, **chiudi la chiamata**: sparisce dagli elenchi e le candidature restano.\n\nOgni candidatura apre una conversazione nella tua inbox: si risponde da lì, non via email.',
   E'The board helps you find a band, a DJ or a technician for a date or a period.\n\n## Who can post\n\nOnly **claimed and verified** pages. One open call per page.\n\n## What to state\n\nRole wanted, city, period, fee and a description. The fee is mandatory: if it is unpaid, say so.\n\n## The application cap\n\nChoose how many requests to receive (1 to 50). You can change it while the call is open. When you find someone, **close the call**: it disappears from listings and applications stay.\n\nEvery application opens a conversation in your inbox: you reply there, not by email.',
   1),
  ('fan', 'notifiche',
   'Notifiche: cosa ricevi e come cancellarle',
   'Notifications: what you get and how to delete them',
   E'Le notifiche restano nell''app: niente email inutili e nessuna metrica di vanità.\n\n## Cosa ti avvisiamo\n\n- Una serata che hai salvato è stata annullata o spostata.\n- Un artista o un locale che segui ha pubblicato una data.\n- Hai ricevuto una richiesta di contatto o una risposta.\n\nNon ti avvisiamo perché qualcuno ha guardato un profilo.\n\n## Come gestirle\n\nDalla campanella apri il centro notifiche: puoi segnare come letta, cancellare una notifica con il cestino o svuotare tutto con “Cancella tutte”. Le notifiche si eliminano da sole dopo 90 giorni.',
   E'Notifications stay in the app: no useless emails and no vanity metrics.\n\n## What we tell you\n\n- A night you saved was cancelled or moved.\n- An artist or venue you follow published a date.\n- You received a contact request or a reply.\n\nWe do not notify you because someone looked at a profile.\n\n## Managing them\n\nFrom the bell open the notification centre: mark as read, delete one with the bin icon or clear everything with “Delete all”. Notifications are removed after 90 days.',
   1),
  ('privacy', 'cancellare-account-scaricare-dati',
   'Cancellare l''account o scaricare i tuoi dati',
   'Delete your account or download your data',
   E'Puoi fare entrambe le cose da solo, dalle impostazioni.\n\n## Scaricare i dati\n\nDashboard → Impostazioni → **Scarica i tuoi dati (JSON)**. Il file contiene profilo, scheda, eventi, preferiti, schede seguite e conversazioni.\n\n## Cancellare l''account\n\nDashboard → Impostazioni → **Cancella account**. Serve scrivere `ELIMINA`: non è un clic distratto e non si può annullare.\n\nCosa sparisce: profilo, email, note private, preferiti, follow e notifiche. Cosa resta: le serate pubblicate restano online senza legame con te, la scheda torna non reclamata e nelle conversazioni dell''altra parte il tuo nome diventa “Account eliminato”.',
   E'You can do both yourself, from the settings.\n\n## Download your data\n\nDashboard → Settings → **Download your data (JSON)**. The file contains profile, page, events, favourites, followed pages and conversations.\n\n## Delete your account\n\nDashboard → Settings → **Delete account**. You must type `ELIMINA`: it is not an accidental click and it cannot be undone.\n\nWhat disappears: profile, email, private notes, favourites, follows and notifications. What stays: published dates stay online with no link to you, the page becomes unclaimed and in the other side''s conversations your name becomes “Deleted account”.',
   1),
  ('eventi', 'festival-multi-giorno',
   'Festival e serate su più giorni',
   'Festivals and multi-day nights',
   E'Un festival è **un** evento con una data di inizio e una di fine, non tre righe da ripetere.\n\n## Come si crea\n\nNell''editor della serata attiva **“Dura più giorni (festival)”** e scegli l''ultimo giorno. La data di fine deve venire dopo l''inizio; un evento può durare al massimo 60 giorni.\n\n## Come si vede\n\nListe, scheda, mappa, widget e EPK mostrano l''intervallo (“20 novembre → 22 novembre 2026”). Il file calendario chiude all''ultimo giorno e la serata resta “in corso” fino a quella data, non passa tra le passate dopo la prima sera.\n\nNon c''è ricorrenza automatica: una residenza settimanale si pubblica una data alla volta.',
   E'A festival is **one** event with a start and an end date, not three rows to repeat.\n\n## How to create it\n\nIn the editor turn on **“Lasts more than one day (festival)”** and pick the last day. The end date must come after the start; an event can last at most 60 days.\n\n## How it looks\n\nLists, page, map, widget and EPK show the range (“20 November → 22 November 2026”). The calendar file closes on the last day and the night stays “live” until then, instead of moving to past events after the first evening.\n\nThere is no automatic recurrence: a weekly residency is published one date at a time.',
   2),
  ('locali', 'chiudere-il-locale',
   'Chiudere e riaprire il locale',
   'Closing and reopening your venue',
   E'Se il locale chiude, la scheda non deve continuare a promettere serate.\n\n## Come si chiude\n\nAccount → **Stato del locale** → scrivi una nota (facoltativa) e premi **Chiudi il locale**.\n\nCosa succede:\n\n- le serate future pubblicate vengono **annullate** con il motivo;\n- la scheda lo dice e il blocco contatti si spegne;\n- il locale esce dalla directory `/locali`.\n\nLe serate passate restano come archivio. Non si può pubblicare una nuova serata da un locale chiuso.\n\n## Riaprire\n\nPremi **Riapri il locale**: la scheda torna disponibile. Le serate annullate restano annullate finché non le rimetti in programma a mano.',
   E'If the venue closes, the page must not keep promising nights.\n\n## How to close it\n\nAccount → **Venue status** → write a note (optional) and press **Close the venue**.\n\nWhat happens:\n\n- future published dates are **cancelled** with the reason;\n- the page says so and the contact block is disabled;\n- the venue leaves the `/locali` directory.\n\nPast nights stay as an archive. You cannot publish a new date from a closed venue.\n\n## Reopening\n\nPress **Reopen the venue**: the page is available again. Cancelled dates stay cancelled until you put them back manually.',
   2)
) as v(category_slug, slug, title_it, title_en, body_it, body_en, position)
join public.help_categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0073', 'help_center')
on conflict (version) do nothing;
