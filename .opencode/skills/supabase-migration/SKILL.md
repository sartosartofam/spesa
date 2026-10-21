---

name: supabase-migration
description: Crea, applica e verifica una migrazione Supabase in locale, con RLS e tipi generati. Usare per qualsiasi modifica a schema, policy, trigger o funzioni SQL.
---

# Migrazione Supabase

1. **Leggi il contratto**: `AGENTS.md` (schema), `docs/DECISIONS.md` (stati, auth, backup) e la issue.
2. **Crea la migrazione**:

   ```bash
   npx supabase migration new <nome_descrittivo>
   ```
3. **Scrivi SQL minimale**: niente `DROP` o `DELETE` senza `WHERE`; niente dati reali.
4. **RLS obbligatoria** su ogni tabella nuova:
   - `alter table ... enable row level security;`
   - policy per `select`/`insert`/`update`/`delete` filtrate per `family_id`.
5. **Applica e verifica**:

   ```bash
   npm run db:reset
   npx supabase test db
   ```
6. **Aggiungi test pgTAP** in `supabase/tests/` per struttura e isolamento.
7. **Rigenera i tipi**:

   ```bash
   npm run db:types
   ```
8. **Verifica finale**: `npm run verify`.

## Regole

- Una migrazione = un cambiamento logico.
- Mai `supabase db push`, `supabase link` o chiavi cloud.
- Se una policy non è ovvia, chiedi review umana prima della PR.
