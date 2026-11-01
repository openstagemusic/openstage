-- ============================================================================
-- OpenStage - Catalogo delle email automatiche
--
-- Una tabella sola con tutte le email che il sistema manda: oggetto, corpo,
-- quando parte, a chi, quali variabili può usare. Serve a leggerle tutte
-- insieme e a correggerle senza cercarle nel codice.
--
-- `source` dice chi comanda davvero il testo:
--   'app'      -> il corpo è qui e il codice lo usa (modificabile da qui)
--   'queue'    -> il testo lo compone una funzione del database (sola lettura)
--   'supabase' -> lo manda Supabase Auth dal suo pannello (sola lettura)
--
-- `editable` è calcolato dalla fonte, ma resta una colonna: se un giorno una
-- email di coda diventerà modificabile, si cambia un valore.
--
-- Idempotente: il seed non sovrascrive un testo già modificato dall'admin.
-- ============================================================================

create table if not exists public.email_templates (
  slug text primary key,
  name text not null,
  category text not null check (category in ('auth', 'transactional', 'digest', 'system')),
  source text not null check (source in ('app', 'queue', 'supabase')),
  audience text not null,
  trigger_label text not null,
  variables text[] not null default '{}',
  subject_it text,
  subject_en text,
  body_it text,
  body_en text,
  note text,
  editable boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

drop policy if exists email_templates_admin_read on public.email_templates;
create policy email_templates_admin_read on public.email_templates
  for select to authenticated using (public.is_admin());

drop policy if exists email_templates_admin_write on public.email_templates;
create policy email_templates_admin_write on public.email_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists email_templates_touch on public.email_templates;
create trigger email_templates_touch
  before update on public.email_templates
  for each row execute function public.touch_updated_at();

insert into public.email_templates
  (slug, name, category, source, audience, trigger_label, variables, subject_it, subject_en, body_it, body_en, note, editable, position)
values
  -- ------------------------------------------------------------------ app
  (
    'app-contact-admin', 'Nuovo messaggio dal modulo contatti', 'transactional', 'app',
    'La casella ufficiale (ciao@getopenstage.it)', 'Quando qualcuno invia il modulo contatti',
    array['name','email','topic','message','locale'],
    '[OpenStage] Contatto — {{topic}}', '[OpenStage] Contact — {{topic}}',
    $t$Nuovo messaggio dal form contatti

Nome: {{name}}
Email: {{email}}
Tema: {{topic}}
Lingua: {{locale}}

{{message}}$t$,
    $t$New message from the contact form

Name: {{name}}
Email: {{email}}
Topic: {{topic}}
Language: {{locale}}

{{message}}$t$,
    'Rispondendo a questa email si risponde direttamente a chi ha scritto.',
    true, 10
  ),
  (
    'app-contact-reply', 'Risposta dell''assistenza', 'transactional', 'app',
    'Chi ha scritto dal modulo contatti', 'Quando l''admin risponde a un ticket',
    array['name','body','topic'],
    'Re: OpenStage — {{topic}}', 'Re: OpenStage — {{topic}}',
    $t$Ciao {{name}},

{{body}}

OpenStage$t$,
    $t$Hi {{name}},

{{body}}

OpenStage$t$,
    'Il reply-to è ciao@getopenstage.it: chi risponde arriva nella casella giusta.',
    true, 20
  ),
  (
    'app-takedown-admin', 'Nuova notice & takedown', 'system', 'app',
    'La casella ufficiale', 'Quando arriva una segnalazione notice & takedown',
    array['noticeId','type','reporterName','reporterEmail','organization','targetUrl','description','locale'],
    '[OpenStage] Notice & takedown - {{type}}', '[OpenStage] Notice & takedown - {{type}}',
    $t$Nuova notice & takedown

ID: {{noticeId}}
Tipo: {{type}}
Nome: {{reporterName}}
Email: {{reporterEmail}}
{{organization}}Contenuto: {{targetUrl}}
Lingua: {{locale}}

{{description}}$t$,
    $t$New notice & takedown

ID: {{noticeId}}
Type: {{type}}
Name: {{reporterName}}
Email: {{reporterEmail}}
{{organization}}Content: {{targetUrl}}
Language: {{locale}}

{{description}}$t$,
    'La riga Organizzazione compare solo se è stata compilata.',
    true, 30
  ),
  (
    'app-takedown-received', 'Conferma di ricezione (notice & takedown)', 'system', 'app',
    'Chi ha inviato la segnalazione', 'Subito dopo una notice & takedown',
    array['name','noticeId'],
    'OpenStage - Notice & takedown ricevuto', 'OpenStage - Notice & takedown received',
    $t$Ciao {{name}},

abbiamo ricevuto la tua segnalazione (ID {{noticeId}}).
La esamineremo e ti risponderemo a questo indirizzo.

OpenStage$t$,
    $t$Hi {{name}},

we received your notice (ID {{noticeId}}).
We will review it and reply to this address.

OpenStage$t$,
    null, true, 40
  ),
  (
    'app-takedown-outcome', 'Esito di una notice & takedown', 'system', 'app',
    'Chi ha inviato la segnalazione', 'Quando l''admin chiude una notice & takedown',
    array['name','noticeId','outcome','action'],
    'OpenStage - Esito notice & takedown', 'OpenStage - Notice & takedown outcome',
    $t$Ciao {{name}},

Riferimento: {{noticeId}}
{{outcome}}
{{action}}

OpenStage$t$,
    $t$Hi {{name}},

Reference: {{noticeId}}
{{outcome}}
{{action}}

OpenStage$t$,
    '`outcome` e `action` arrivano già scritti nella lingua di chi ha segnalato.',
    true, 50
  ),

  -- ---------------------------------------------------------------- queue
  (
    'queue-digest', 'Riepilogo settimanale', 'digest', 'queue',
    'Fan con il riepilogo attivo', 'Ogni lunedì (funzione enqueue_weekly_digests)',
    array['lines'],
    'La tua settimana su OpenStage', 'Your week on OpenStage',
    $t$Le tue serate salvate e quelle degli artisti e locali che segui questa settimana:

{{lines}}

Ci vediamo in giro.
OpenStage$t$,
    $t$Your saved nights and the ones from artists and venues you follow this week:

{{lines}}

See you out there.
OpenStage$t$,
    'Il testo è composto dalla funzione del database: la lista delle serate cambia a ogni invio.',
    false, 60
  ),
  (
    'queue-account-suspended', 'Account sospeso', 'transactional', 'queue',
    'Chi viene sospeso', 'Quando l''admin sospende un account',
    array[]::text[],
    'Il tuo account OpenStage è stato sospeso', 'Your OpenStage account has been suspended',
    $t$Ciao,

il tuo account OpenStage è stato sospeso. Non puoi creare nuovi eventi finché la sospensione resta attiva.

Se pensi sia un errore, rispondi a questa email o scrivici dal modulo contatti: https://getopenstage.it/contatti

OpenStage$t$,
    $t$Hi,

your OpenStage account has been suspended. You cannot create new events while the suspension is active.

If you think this is a mistake, reply to this email or write to us from the contact form: https://getopenstage.it/contact

OpenStage$t$,
    'Testo composto da admin_set_user_suspended (database).',
    false, 70
  ),
  (
    'queue-account-restored', 'Account ripristinato', 'transactional', 'queue',
    'Chi viene ripristinato', 'Quando l''admin riattiva un account',
    array[]::text[],
    'Il tuo account OpenStage è stato ripristinato', 'Your OpenStage account has been restored',
    $t$Ciao,

il tuo account OpenStage è stato ripristinato. Puoi di nuovo creare eventi.

OpenStage$t$,
    $t$Hi,

your OpenStage account has been restored. You can create events again.

OpenStage$t$,
    'Testo composto da admin_set_user_suspended (database).',
    false, 80
  ),
  (
    'queue-claim-invite', 'Invito a reclamare una scheda', 'transactional', 'queue',
    'Artista o locale creato dalla redazione', 'Quando l''admin crea un invito al claim',
    array['name','link'],
    'Reclama la scheda di {{name}} su OpenStage', 'Claim the {{name}} page on OpenStage',
    $t$Ciao,

OpenStage ha creato la scheda di {{name}} e vuole darti la possibilità di amministrarla.

Apri questo link per reclamarla (scade tra 7 giorni, vale una sola volta):
{{link}}

Se non sei tu, ignora questa email.

OpenStage$t$,
    $t$Hi,

OpenStage created the {{name}} page and wants to give you the chance to manage it.

Open this link to claim it (expires in 7 days, valid once):
{{link}}

If this is not you, ignore this email.

OpenStage$t$,
    'Testo composto da admin_create_claim_invite (database).',
    false, 90
  ),

  -- ------------------------------------------------------------- supabase
  (
    'auth-confirm-signup', 'Conferma l''indirizzo email', 'auth', 'supabase',
    'Chi si iscrive con email e password', 'Subito dopo la registrazione',
    array['confirmation_url'],
    null, null, null, null,
    'Il testo è in Supabase → Authentication → Email Templates. Si può modificare da lì; qui si vede solo che esiste.',
    false, 100
  ),
  (
    'auth-recovery', 'Recupero password', 'auth', 'supabase',
    'Chi dimentica la password', 'Quando si chiede "password dimenticata"',
    array['confirmation_url'],
    null, null, null, null,
    'Il testo è in Supabase → Authentication → Email Templates.',
    false, 110
  ),
  (
    'auth-magic-link', 'Accesso con link', 'auth', 'supabase',
    'Chi usa il link di accesso', 'Quando si chiede un link invece della password',
    array['confirmation_url'],
    null, null, null, null,
    'Il testo è in Supabase → Authentication → Email Templates. Oggi non è usato dall''interfaccia.',
    false, 120
  ),
  (
    'auth-change-email', 'Conferma del cambio email', 'auth', 'supabase',
    'Chi cambia indirizzo', 'Quando un profilo chiede di cambiare email',
    array['confirmation_url'],
    null, null, null, null,
    'Il testo è in Supabase → Authentication → Email Templates.',
    false, 130
  )
on conflict (slug) do nothing;

insert into supabase_migrations.schema_migrations (version, name) values
  ('0078', 'email_catalog')
on conflict (version) do nothing;
