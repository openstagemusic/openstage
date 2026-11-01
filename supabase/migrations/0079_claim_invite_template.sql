-- ============================================================================
-- OpenStage - Invito a reclamare una scheda: testo migliore e modificabile
--
-- L'invito era scritto dentro la funzione SQL che accoda l'email, quindi non si
-- poteva correggere senza una migrazione — e il testo sembrava una notifica
-- automatica. Da adesso:
--
-- 1. la funzione accoda solo il "chi" e i dati (nome della scheda, link), con
--    `metadata.template_slug` che dice al worker quale testo usare;
-- 2. il testo vive nel catalogo (`email_templates`) ed è **modificabile dalla
--    control room**;
-- 3. il reply-to è ciao@getopenstage.it: chi risponde parla con una persona,
--    non con un indirizzo noreply.
--
-- Il testo scritto dentro la funzione resta come riserva: se il catalogo non
-- risponde, l'invito parte lo stesso.
--
-- Idempotente.
-- ============================================================================

create or replace function public.admin_create_claim_invite(
  p_subject_type text,
  p_subject_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text;
  v_slug text;
  v_owner uuid;
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '7 days';
  v_account uuid;
  v_link text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può invitare' using errcode = '42501';
  end if;

  if p_subject_type not in ('artist', 'venue') then
    raise exception 'Tipo di scheda non valido' using errcode = 'P0001';
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    raise exception 'Email non valida' using errcode = 'P0001';
  end if;

  if p_subject_type = 'artist' then
    select name, slug, profile_id into v_name, v_slug, v_owner
      from public.artists where id = p_subject_id;
    if not found then
      raise exception 'Scheda artista inesistente' using errcode = 'P0002';
    end if;
    if v_owner is not null then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
  else
    select name, slug, profile_id into v_name, v_slug, v_owner
      from public.venues where id = p_subject_id;
    if not found then
      raise exception 'Scheda locale inesistente' using errcode = 'P0002';
    end if;
    if v_owner is not null then
      raise exception 'Questa scheda è già reclamata' using errcode = 'P0001';
    end if;
  end if;

  if exists (
    select 1 from public.claim_invites
    where status = 'pending'
      and coalesce(artist_id, venue_id) = p_subject_id
  ) then
    raise exception 'Esiste già un invito in attesa per questa scheda' using errcode = 'P0001';
  end if;

  select id into v_account from public.profiles where lower(email) = v_email limit 1;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.claim_invites (
    subject_type, artist_id, venue_id, email, channel, token_hash, expires_at, created_by
  )
  values (
    p_subject_type,
    case when p_subject_type = 'artist' then p_subject_id end,
    case when p_subject_type = 'venue' then p_subject_id end,
    v_email,
    case when v_account is not null then 'notification' else 'email' end,
    v_hash,
    v_expires,
    v_admin
  )
  returning id into v_invite_id;

  v_link := 'https://getopenstage.it/claim/' || v_token;

  if v_account is not null then
    insert into public.notifications (user_id, type, title, body, href, priority, metadata)
    values (
      v_account,
      'claim',
      'Invito a reclamare una scheda',
      'Sei stato invitato a reclamare la scheda di ' || v_name || ' su OpenStage.',
      '/claim/' || v_token,
      'normal',
      jsonb_build_object('inviteId', v_invite_id, 'subjectType', p_subject_type)
    );
  else
    insert into public.email_queue (
      to_email, from_email, reply_to, subject, text_body, category, idempotency_key, metadata
    )
    values (
      v_email,
      'OpenStage <noreply@getopenstage.it>',
      'ciao@getopenstage.it',
      v_name || ', la tua scheda su OpenStage',
      -- Riserva: il testo vero è nel catalogo (`queue-claim-invite`).
      'Ciao,' || chr(10) || chr(10) ||
      'sono Francesco, ho creato OpenStage: una mappa gratuita delle serate dal vivo, senza pubblicità e senza pay-to-play.' || chr(10) || chr(10) ||
      'Cercando date nella tua zona ho trovato ' || v_name || ' e ho preparato la scheda con quello che c''era in giro: nome, città, qualche link. Adesso è online, ma senza di te resta una pagina a metà.' || chr(10) || chr(10) ||
      'Se sei tu, prendila in gestione da qui:' || chr(10) ||
      v_link || chr(10) || chr(10) ||
      'Dentro trovi la bio, le foto, le prossime serate e i contatti: quello che scrivi è quello che i fan vedono. Da quel momento la scheda è tua e nessun altro può modificarla.' || chr(10) || chr(10) ||
      'Il link vale una volta sola e scade tra 7 giorni. Se non sei tu, ignora questa email.' || chr(10) || chr(10) ||
      'Grazie,' || chr(10) ||
      'Francesco' || chr(10) ||
      'OpenStage — getopenstage.it',
      'transactional',
      'claim-invite:' || v_invite_id::text,
      jsonb_build_object(
        'inviteId', v_invite_id,
        'subjectType', p_subject_type,
        'template_slug', 'queue-claim-invite',
        'locale', 'it',
        'variables', jsonb_build_object('name', v_name, 'link', v_link)
      )
    )
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (
    v_admin,
    'claim.invite',
    p_subject_type,
    p_subject_id,
    jsonb_build_object('inviteId', v_invite_id, 'email', v_email, 'notifiedProfile', v_account)
  );

  return jsonb_build_object('id', v_invite_id, 'expiresAt', v_expires, 'link', v_link);
end;
$fn$;

revoke all on function public.admin_create_claim_invite(text, uuid, text) from public;
grant execute on function public.admin_create_claim_invite(text, uuid, text) to authenticated;

-- Il testo ora vive nel catalogo: si modifica dalla control room.
update public.email_templates
   set editable = true,
       subject_it = $t${{name}}, la tua scheda su OpenStage$t$,
       subject_en = $t${{name}}, your page on OpenStage$t$,
       body_it = $t$Ciao,

sono Francesco, ho creato OpenStage: una mappa gratuita delle serate dal vivo, senza pubblicità e senza pay-to-play.

Cercando date nella tua zona ho trovato {{name}} e ho preparato la scheda con quello che c'era in giro: nome, città, qualche link. Adesso è online, ma senza di te resta una pagina a metà.

Se sei tu, prendila in gestione da qui:

{{link}}

Dentro trovi la bio, le foto, le prossime serate e i contatti: quello che scrivi è quello che i fan vedono. Da quel momento la scheda è tua e nessun altro può modificarla.

Il link vale una volta sola e scade tra 7 giorni. Se non sei tu, ignora questa email.

Grazie,
Francesco
OpenStage — getopenstage.it$t$,
       body_en = $t$Hi,

I'm Francesco, the person behind OpenStage: a free map of live music, with no ads and no pay-to-play.

While looking for dates near you I found {{name}} and put together a page with what was around: name, city, a few links. It is online now, but without you it stays half a page.

If this is you, take it over here:

{{link}}

Inside you'll find the bio, the photos, upcoming dates and contact details: what you write is what fans see. From that moment the page is yours and nobody else can edit it.

The link works once and expires in 7 days. If this is not you, ignore this email.

Thanks,
Francesco
OpenStage — getopenstage.it$t$,
       note = 'Il testo è nel catalogo: la funzione del database accoda solo nome e link. Il reply-to è ciao@getopenstage.it.',
       updated_at = now()
 where slug = 'queue-claim-invite';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0079', 'claim_invite_template')
on conflict (version) do nothing;
