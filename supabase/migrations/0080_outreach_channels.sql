-- ============================================================================
-- OpenStage - Canali di outreach (gruppi, testate, radio, community)
--
-- Serve a rispondere a una domanda sola: dove si può far conoscere OpenStage
-- senza fare spam? La tabella tiene l'elenco, le regole di ogni canale e lo
-- stato del contatto. L'invio resta manuale: nessuna automazione su Instagram,
-- Facebook o TikTok (violerebbe i loro termini e brucerebbe il profilo).
--
-- I canali inseriti qui sono quelli verificati il 3 novembre 2026. Le regole
-- riportano ciò che il canale dichiara pubblicamente; dove non è dichiarato,
-- la nota dice di leggerlo prima di scrivere.
--
-- Idempotente.
-- ============================================================================

create table if not exists public.outreach_channels (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         text not null default 'altro',
  area         text not null default 'Bergamo',
  url          text not null,
  rules        text,
  note         text,
  status       text not null default 'todo',
  contacted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint outreach_channels_kind check (
    kind in ('gruppo-facebook', 'telegram', 'instagram', 'testata', 'radio', 'newsletter', 'comunita', 'altro')
  ),
  constraint outreach_channels_area check (area in ('Bergamo', 'Provincia', 'Italia')),
  constraint outreach_channels_status check (status in ('todo', 'contacted', 'replied', 'discarded')),
  constraint outreach_channels_url_unique unique (url)
);

create index if not exists outreach_channels_status_idx
  on public.outreach_channels (status, area, name);

alter table public.outreach_channels enable row level security;

drop policy if exists outreach_channels_admin_read on public.outreach_channels;
create policy outreach_channels_admin_read on public.outreach_channels
  for select to authenticated using (public.is_admin());

drop policy if exists outreach_channels_admin_write on public.outreach_channels;
create policy outreach_channels_admin_write on public.outreach_channels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.outreach_channels (name, kind, area, url, rules, note) values
  (
    'Musica a Bergamo',
    'gruppo-facebook',
    'Bergamo',
    'https://www.facebook.com/groups/1640672456148430/',
    'Nella descrizione: il gruppo nasce per sapere quali eventi musicali ci sono a Bergamo e per dare ai gruppi la possibilità di proporsi. L''autopromozione è nello spirito del gruppo, ma leggi il regolamento prima di postare.',
    'Il più centrato sul target: musica dal vivo a Bergamo.'
  ),
  (
    'EVENTI E SERATE',
    'gruppo-facebook',
    'Italia',
    'https://www.facebook.com/groups/210272382380870/',
    'Nella descrizione: «gruppo dove tutti gli amici possono pubblicizzare musica, serate, eventi». Autopromozione ammessa.',
    'Generico e nazionale: utile per le band, non per Bergamo.'
  ),
  (
    'Sei di Bergamo e Provincia se...',
    'gruppo-facebook',
    'Provincia',
    'https://www.facebook.com/groups/513248295458653/',
    'Community generalista: la descrizione chiede «uno spazio autentico e sicuro». Non è un gruppo di annunci.',
    'Solo ascolto: serve a capire cosa si dice, non a promuoversi.'
  ),
  (
    'Bergamo e Provincia',
    'gruppo-facebook',
    'Provincia',
    'https://www.facebook.com/groups/743954606062331/',
    'Regolamento: aggiungere solo profili reali; il gruppo nasce per valorizzare il territorio con foto. Non è uno spazio pubblicitario.',
    'Da non usare per annunci.'
  ),
  (
    'Bergamo per i Giovani (Telegram)',
    'telegram',
    'Bergamo',
    'https://t.me/BergamoperiGiovani',
    'Canale del Comune di Bergamo: iniziative, eventi e opportunità per i giovani. Non è un canale di annunci commerciali.',
    'Canale ufficiale: si può proporre una segnalazione, non pubblicare.'
  ),
  (
    'Università di Bergamo',
    'telegram',
    'Bergamo',
    'https://t.me/unibg',
    'Canale ufficiale dell''Università: comunicazioni istituzionali.',
    'Utile per il calendario studenti, non per promozione.'
  ),
  (
    'L''Eco di Bergamo',
    'testata',
    'Provincia',
    'https://www.ecodibergamo.it',
    'Quotidiano locale: agenda eventi e segnalazioni dalla redazione.',
    'Copre tutta la provincia: la testata più letta.'
  ),
  (
    'BergamoNews',
    'testata',
    'Provincia',
    'https://www.bergamonews.it',
    'Quotidiano online: cronaca e agenda di Bergamo e provincia.',
    'Ha una sezione eventi: verificare il modulo di segnalazione.'
  ),
  (
    'Prima Bergamo',
    'testata',
    'Provincia',
    'https://www.primabergamo.it',
    'Quotidiano online di Bergamo e provincia.',
    'Nota: bergamopost.it oggi reindirizza qui.'
  ),
  (
    'Eppen',
    'testata',
    'Provincia',
    'https://www.eppen.it',
    'Agenda culturale di Bergamo e provincia, con modulo «per proporre un evento».',
    'La più adatta: pubblica le serate, non solo le notizie.'
  ),
  (
    'Bergamo Tomorrow',
    'testata',
    'Bergamo',
    'https://www.bergamotomorrow.it',
    'Portale di notizie locali con articoli su festival e rassegne.',
    'Buono per un articolo, non per un annuncio.'
  ),
  (
    'Visit Bergamo',
    'testata',
    'Provincia',
    'https://www.visitbergamo.net',
    'Portale turistico ufficiale: eventi in vetrina.',
    'Le serate entrano se sono già un evento pubblico riconoscibile.'
  ),
  (
    'Comune di Bergamo — Ufficio Giovani',
    'comunita',
    'Bergamo',
    'https://www.comune.bergamo.it',
    'Istituzione: promuove iniziative per i giovani, tra cui Nuovi Suoni Live.',
    'Per segnalare la mappa come strumento utile, non per pubblicità.'
  ),
  (
    'Radio Alta',
    'radio',
    'Provincia',
    'https://www.radioalta.it',
    'Radio locale di Bergamo.',
    'Sito non raggiungibile al controllo del 3 novembre: verificare il contatto prima di scrivere.'
  )
on conflict (url) do nothing;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0080', 'outreach_channels')
on conflict (version) do nothing;
