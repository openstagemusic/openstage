-- 0028 - Contatti: il modulo scrive davvero, l'admin legge.
--
-- Fase 6.1: la pagina /contatti non è più un segnaposto. Il modulo pubblico
-- inserisce una riga, senza servizi email esterni (Resend arriva nella Fase 7).
-- La tabella è scrivibile da anon e authenticated, ma leggibile e modificabile
-- solo dall'admin. Nessun dato personale viene mostrato in pubblico.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (
    char_length(email) <= 160
    and position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
  ),
  topic text not null check (topic in ('general', 'artist', 'venue', 'report', 'privacy', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  locale text not null default 'it' check (locale in ('it', 'en')),
  status text not null default 'new' check (status in ('new', 'read', 'closed')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  closed_at timestamptz
);

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);

comment on table public.contact_messages is
  'Messaggi dal modulo contatti: pubblici in scrittura, visibili solo all''admin.';

alter table public.contact_messages enable row level security;

-- Il modulo è aperto a chi non ha un account. La policy impedisce di impostare
-- uno stato o una data di lettura direttamente dall'API.
drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and read_at is null and closed_at is null);

drop policy if exists contact_messages_select_admin on public.contact_messages;
create policy contact_messages_select_admin on public.contact_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists contact_messages_update_admin on public.contact_messages;
create policy contact_messages_update_admin on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists contact_messages_delete_admin on public.contact_messages;
create policy contact_messages_delete_admin on public.contact_messages
  for delete to authenticated
  using (public.is_admin());

grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;
