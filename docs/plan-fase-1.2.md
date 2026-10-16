# Fase 1.2 — Hardening del database

> Pianificazione (regola AGENTS.md #1). Interventi derivati dagli **advisor Supabase** letti via MCP,
> non da un refactoring a piacere: ogni punto qui sotto corrisponde a un lint reale del database.

## Perché adesso

Il database ha 5 righe in `profiles` e 0 eventi. Le ottimizzazioni sulle policy RLS costano ora
una riscrittura di 12 policy; tra sei mesi costano la stessa riscrittura con il sito in produzione.
Il lavoro di sicurezza, invece, ha senso farlo quando l'esposizione è minima.

## Interventi (migration `0003_hardening.sql`)

| # | Advisor | Intervento |
|---|---|---|
| 1 | `function_search_path_mutable` | `touch_updated_at` è l'unica funzione senza `search_path` fisso → aggiunto `set search_path = public` |
| 2 | `anon/authenticated_security_definer_function_executable` | Revoca `EXECUTE` su `handle_new_user()` e `prevent_role_escalation()`: sono funzioni **trigger**, non devono essere chiamabili via `/rest/v1/rpc/`. I trigger non controllano `EXECUTE` a runtime, quindi la revoca è sicura (verificata con test reale) |
| 3 | `unindexed_foreign_keys` | Indici su `events.artist_id`, `events.venue_id`, `events.created_by` → servono a mappa e lista della Fase 2 |
| 4 | `auth_rls_initplan` (12 policy) | `auth.uid()` / `is_admin()` avvolti in `(select …)`: valutati **una volta per query** invece che per riga. Semantica invariata |
| 5 | `multiple_permissive_policies` su `profiles` | Fusione `profiles_select_own`+`profiles_select_admin` → `profiles_select_own_or_admin` (idem per update) |
| 6 | `list_migrations` vuoto | Il progetto è nato con SQL applicato a mano: creo `supabase_migrations.schema_migrations` con lo schema canonico della CLI e registro `0001`, `0002`, `0003` |

### Consapevolmente NON risolti (con motivazione)

- `is_admin()` resta `SECURITY DEFINER` ed eseguibile da `anon`/`authenticated`: le **policy RLS la
  invocano** (se non fosse eseguibile, ogni query pubblica andrebbe in errore) ed è `SECURITY DEFINER`
  perché deve leggere `settings`, che è admin-only. Ritorna un booleano su se stessi: nessun dato esposto.
- `unused_index` su `events_starts_at_idx` / `events_city_idx`: normalissimo senza eventi. Serviranno.

## Verifiche previste (non "dovrebbe funzionare")

1. `handle_new_user` funziona ancora dopo la revoca → creo un utente di test e controllo che nasca il profilo.
2. `prevent_role_escalation` funziona ancora → cambio ruolo da `fan` ad `artist` (deve riuscire) e tentativo `admin` (deve fallire).
3. `anon` non vede `settings` né profili altrui; un utente vede **solo** la propria riga.
4. Advisor di sicurezza e performance ripuliti (restano solo i punti motivati sopra).
5. `npm run build` + deploy verde.

## Fuori scope

Attivazione della **leaked password protection** (Auth): è un toggle della dashboard, non SQL.
