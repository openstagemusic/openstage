-- ============================================================================
-- OpenStage — Fase 3.3.2 (Editor degli eventi)
-- Due colonne facoltative che servono all'editor.
--
-- `price_text`: gli eventi a pagamento non avevano il prezzo nel database (c'era
--   solo `is_free` e il link ai biglietti). Il prezzo resta testo libero perché
--   in un locale piccolo è "10 €", "offerta libera", "8 € + tessera": imporre un
--   numero significherebbe buttare via informazione vera.
-- `venue_name`: il nome del locale che non ha (ancora) una scheda su OpenStage.
--   Senza questa colonna una serata in un posto nuovo mostrerebbe solo la città.
--
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

alter table public.events add column if not exists price_text text;
alter table public.events add column if not exists venue_name text;

comment on column public.events.price_text is
  'Prezzo in testo libero ("10 €", "offerta libera"). Mostrato solo se is_free = false.';
comment on column public.events.venue_name is
  'Nome del locale senza scheda su OpenStage: mostrato quando venue_id è nullo.';
