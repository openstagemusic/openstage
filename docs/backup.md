# Backup del database

> Ultimo aggiornamento: 27 ottobre 2026.
> Scelta: **GitHub Actions + `pg_dump`**, senza piano Supabase Pro.

## Perché non i backup Supabase

Il piano **Free di Supabase non include backup automatici**. I backup nativi
(giornalieri, con retention e PITR) richiedono il piano **Pro**. Per non pagare
un piano superiore, OpenStage usa un dump logico settimanale.

## Stato

- Primo backup: **27 ottobre 2026, 20:37 UTC**, 233 KB, checksum SHA-256 verificato.
- Artifact GitHub `db-backup-1` e copia nel bucket `backups`.
- Prossimo passo: prova di ripristino su un progetto Supabase di test.

## Cosa fa il workflow

File: `.github/workflows/db-backup.yml`

- Parte **ogni domenica alle 03:00 UTC** e si può avviare a mano.
- Esegue `pg_dump` in formato custom, senza owner e privilegi.
- Verifica il dump con `pg_restore --list`.
- Lo cifra con **GPG AES-256**.
- Salva:
  1. un **artifact GitHub** con retention **90 giorni**;
  2. una copia nel bucket Supabase privato **`backups`**, con rotazione delle
     ultime **12** copie (circa tre mesi).
- Accanto a ogni file salva il checksum **SHA-256**.

## Secret da impostare su GitHub

Pagina: `https://github.com/openstagemusic/openstage/settings/secrets/actions`
→ **New repository secret**.

| Nome | Valore |
| --- | --- |
| `SUPABASE_DB_URL` | Supabase → **Project Settings → Database → Connection string → Session pooler**. Sostituisci `[YOUR-PASSWORD]` con la password del database. Serve la versione **IPv4** (session pooler), non la connessione diretta IPv6. |
| `SUPABASE_URL` | `https://tzdigzvkneonkhkwoeed.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role`. Non condividerla e non metterla nel repository. |
| `BACKUP_PASSPHRASE` | Una passphrase lunga, generata una volta e conservata in un password manager. Senza questa i backup non si aprono. |

Dopo averli aggiunti: GitHub → **Actions** → **Database backup** → **Run
workflow**. La prima esecuzione va controllata a mano.

## Ripristino

Scarica il file `.dump.gpg` e il suo `.sha256` dall'artifact o dal bucket
`backups`, poi:

```bash
sha256sum -c openstage-YYYYMMDD-HHMMSS.dump.gpg.sha256
gpg --decrypt openstage-YYYYMMDD-HHMMSS.dump.gpg > openstage.dump
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$SUPABASE_DB_URL" openstage.dump
```

Regole:

- Prova sempre il ripristino su un **progetto Supabase di test**, mai subito in
  produzione.
- Durante un ripristino reale, metti il sito in manutenzione e ferma le
  modifiche: il dump riporta il database al momento dell'esecuzione.
- Conserva la passphrase separatamente dai backup.

## Limiti

- Il bucket Supabase è nello stesso progetto: **non** protegge dalla perdita
  totale del progetto. La copia GitHub sì.
- Gli artifact scadono dopo 90 giorni. Per conservazioni più lunghe, scarica il
  file o aggiungi un bucket esterno (Cloudflare R2, Backblaze B2, S3).
- È un backup **logico**, non un PITR: non ripristina al secondo, ma al momento
  del dump.
- Un workflow schedulato può essere disattivato da GitHub dopo lunghi periodi
  di inattività del repository: controlla ogni tanto che l'ultima esecuzione
  sia recente.
