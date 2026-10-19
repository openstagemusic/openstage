-- ============================================================================
-- OpenStage - Fase 3.3.3 (Locandine)
-- Archivio delle locandine: un bucket pubblico in lettura, con la scrittura
-- limitata alla propria cartella.
--
-- Perché un archivio e non un indirizzo web incollato a mano: chi organizza una
-- serata ha la locandina sul telefono o sul computer, non un link da copiare. E
-- la locandina resta nostra: se un domani il sito di partenza la toglie, la
-- scheda dell'evento continua a mostrarla.
--
-- I due controlli che contano - peso massimo e tipi ammessi - sono impostati sul
-- bucket: li applica il servizio di archiviazione, quindi valgono anche se
-- qualcuno carica senza passare dalla nostra interfaccia. La stessa regola dei
-- limiti anti-spam: nel database, non nel modulo.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  -- 3 MB: una locandina da stampa ridimensionata dal browser ci sta comoda,
  -- mentre una foto di telefono non ridimensionata no (e non deve passare).
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lettura: le locandine stanno sulle schede pubbliche degli eventi, quindi le
-- vede chiunque. Il bucket è già pubblico in lettura; questa politica rende
-- esplicito il permesso anche per le chiamate con sessione.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'event_covers_read'
  ) then
    create policy event_covers_read on storage.objects
      for select using (bucket_id = 'event-covers');
  end if;
end $$;

-- Scrittura: ognuno nella **propria** cartella. Il nome è `{profilo}/{uuid}.{ext}`,
-- quindi la prima cartella deve essere il proprio `auth.uid()`: nessuno può
-- sovrascrivere o cancellare la locandina di un altro. Il controllo è qui, non
-- nell'interfaccia.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'event_covers_insert_own'
  ) then
    create policy event_covers_insert_own on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'event-covers'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
