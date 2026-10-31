-- Fase 14B: quando il ruolo viene scelto (B06)
alter table public.profiles
  add column if not exists role_chosen_at timestamptz;

update public.profiles
   set role_chosen_at = coalesce(updated_at, created_at, now())
 where role <> 'fan' and role_chosen_at is null;

comment on column public.profiles.role_chosen_at is
  'Quando la persona ha scelto artista o locale (NULL per i fan).';

insert into supabase_migrations.schema_migrations (version, name) values
  ('0074', 'role_chosen_at')
on conflict (version) do nothing;
