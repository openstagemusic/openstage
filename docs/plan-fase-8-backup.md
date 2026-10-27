# Fase 8.9 - Backup del database

> **Stato: infrastruttura pronta, in attesa dei secret GitHub.** Scritto il 27 ottobre 2026.
> Scelta approvata: **GitHub Actions + `pg_dump`**, senza piano Supabase Pro.

## Obiettivo

Avere un backup reale e ripristinabile del database, senza dipendere dai
backup automatici di Supabase (il piano Free non li include).

## Architettura

- Workflow GitHub Actions settimanale (domenica 03:00 UTC) e avviabile a mano.
- `pg_dump` in formato custom, validato con `pg_restore --list`.
- Cifratura **GPG AES-256** con passphrase conservata fuori dal repository.
- Doppia copia:
  1. **artifact GitHub** (90 giorni): fuori da Supabase, protegge anche dalla
     perdita del progetto;
  2. **bucket Supabase privato `backups`**: comodo per il ripristino, con
     rotazione delle ultime 12 copie.
- Checksum SHA-256 accanto a ogni backup.

## Secret GitHub richiesti

| Secret | Dove si prende |
| --- | --- |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string → **Session pooler** (IPv4), con la password del database |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `BACKUP_PASSPHRASE` | generata una volta e conservata in un password manager |

La passphrase non va mai committata: senza di essa i backup non si aprono.

## Ripristino

1. Scaricare l'artifact o il file dal bucket `backups`.
2. Verificare lo SHA-256.
3. Decifrare con `gpg --decrypt`.
4. `pg_restore --clean --if-exists --no-owner --no-privileges` verso un progetto
   di prova, mai direttamente in produzione senza averlo provato.

## Limiti

- Il bucket Supabase è nello stesso progetto: **non** protegge dalla perdita
  totale del progetto. Per quello serve l'artifact GitHub (o un bucket esterno).
- Gli artifact scadono dopo 90 giorni: per conservazioni lunghe va scaricato il
  file o aggiunto un bucket esterno.
- Il backup è logico, non un PITR: il ripristino porta al momento del dump.

## QA

- [x] Bucket privato `backups` creato con migrazione.
- [x] Workflow con schedule e avvio manuale.
- [x] Controllo dei secret mancanti con messaggio esplicito.
- [ ] Prima esecuzione reale dopo l'inserimento dei 4 secret.
- [ ] Prova di ripristino su progetto di test.
