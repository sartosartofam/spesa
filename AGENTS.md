# AGENTS.md

Leggere prima di agire. In caso di conflitto con l'utente, chiedere conferma.

## Contesto

Webapp familiare per la lista della spesa condivisa (fase 1: solo spesa; fase 2: faccende).

- Frontend: **Preact + Vite** (deciso, ADR-0005), PWA mobile-first.
- Backend/DB/Auth: Supabase (Postgres + Auth + REST + Realtime + RLS).
- Hosting: Vercel, deploy automatico da `main`; preview per le PR.
- Codebase: GitHub.
- Keepalive: due ping giornalieri indipendenti (Raspberry Pi + GitHub Actions).
- Backup: export settimanale su Cloudflare R2 / Backblaze B2 (ADR-0003).

Leggere anche `docs/DECISIONS.md` (decisioni vincolanti) e `docs/ROADMAP.md` (stato e prossimi task).

## Branch, PR e autonomia

- `main` = produzione. Ci finisce solo ciò che l'umano promuove.
- `dev` = branch di integrazione: qui si mergiano le PR.
- `feat/*`, `test/*`, `chore/*` = lavoro degli agenti, sempre creati da `dev`.
- Push remoto consentito solo su `dev` e sui branch di lavoro. **Mai su `main`** senza ordine esplicita dell'umano.
- Gli agenti possono aprire PR verso `dev` e, con CI verde, abilitare l'auto-merge (squash) sulla PR. Vedi ADR-0004.
- Un task = una issue = un branch = una PR piccola. Non mescolare backend, frontend e refactor nello stesso branch.
- Un agente alla volta sugli stessi file. Parallelismo solo con worktree Git separati e un Supabase locale per worktree.

## Definition of done

Una PR è pronta solo se:

- `npm run verify` è verde (lint, typecheck, unit, build).
- Il comportamento nuovo o modificato ha un test.
- Le modifiche a schema o RLS hanno un test pgTAP (`npx supabase test db`).
- Non ci sono secret, token, `.env` o dati reali nel diff.
- Nessuna credenziale o chiamata alla produzione.
- La PR descrive cosa cambia, come testarlo e cosa resta fuori.
- La CI è verde.

## Ruoli

- **Backend**: schema DB, migrazioni, RLS, Edge Functions, script. Branch `feat/backend-*`.
- **Frontend**: UI, PWA, client Supabase, realtime. Branch `feat/frontend-*`.
- **QA/Test**: test e2e, verifica RLS, test ripristino backup. Branch `test/*`.
- **Reviewer**: sola lettura, controlla sicurezza, RLS, test mancanti.
- **Umano**: account, autorizzazioni, review RLS, merge/promozione su `main`, deploy prod.

## Sicurezza (non negoziabile)

1. `service_role` / `SECRET_KEY` mai nel frontend, in Git, in `.env` committato o nei log. Solo in env lato server.
2. `anon` / `PUBLISHABLE_KEY` è l'unica chiave ammessa nel frontend e nel cron del Pi.
3. Ogni tabella deve avere RLS abilitata. Se manca, fermarsi e chiedere.
4. Nessuna operazione distruttiva (`DROP`, `DELETE` senza `WHERE`, `TRUNCATE`) senza conferma umana.
5. `.gitignore` deve includere `.env*`, `node_modules/`, `dist/`, `.vercel/`, `*.local`.
6. Nessun dato reale della famiglia in test o seed: usare dati fittizi.
7. Gli agenti usano solo Supabase locale. Nessuna chiave cloud, nessun `supabase link`, nessun `db push` verso la produzione.

## File ownership

- Backend: `supabase/migrations/*`, `supabase/functions/*`, `supabase/tests/*`, `scripts/backup/*`, `scripts/keepalive/*`.
- Frontend: `src/*`, `public/*`, `index.html`, `vite.config.*`, `package.json` (dipendenze frontend).
- QA/Test: `tests/*`, `e2e/*`, `docs/test-*.md`.
- Solo umano: `AGENTS.md`, `README.md`, `.github/*`, `vercel.json`, `.env.example`.
- Condivisi: `package.json`, `package-lock.json`, `docs/DECISIONS.md`, `docs/ROADMAP.md`. Modificarli solo se il task lo richiede, spiegando perché nella PR.

Se serve modificare un file non proprio, fermarsi e chiedere.

## Schema dati (fase 1)

```
families (id, name, created_at)
members (id, family_id, email, display_name, role, created_at)
items (
  id, family_id, name, category, status, urgent, note, quantity,
  created_by, created_at, updated_at, bought_at
)
push_subscriptions (id, member_id, endpoint, keys, created_at)
keepalive (id, last_ping)
```

- `status`: `to_buy` | `bought` (ADR-0001).
- `urgent = true`: segnalazione "è finito", notifica e priorità in lista.
- Query su `items`/`members` sempre filtrate per `family_id` via RLS.
- `keepalive` pubblica in sola lettura (`select` ad `anon`), niente altro.

## Comandi utili

```bash
npm ci
npm run dev
npm run verify
npm run test:e2e
npm run db:start
npm run db:reset
npm run env:local
npm run db:types
npx supabase test db
git config core.hooksPath .githooks   # una volta per clone
```

`supabase` è una devDependency: usare `npx supabase`, non installazioni globali.

## Divieti

- **Mai `git push` o merge su `main`.** La produzione Vercel si deploya da `main` e i deploy gratuiti sono limitati. Il lavoro viaggia su `dev` e sui branch `feat/*`, `test/*`, `chore/*`.
- Niente commit diretti su `main`; niente chiavi/token/`.env` committati.
- Non disabilitare RLS per "far funzionare le cose".
- Non usare `service_role` nel frontend.
- Non modificare `AGENTS.md`/`README.md` senza istruzione umana.
- Niente `git push --force` su branch condivisi.
- Non assumere deploy ok: verificare i log Vercel.
- Non toccare Supabase di produzione senza autorizzazione esplicita.
- Non fare `supabase db push`, `supabase link` o operazioni cloud senza autorizzazione.

## Flusso standard

1. Leggere `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md` e la issue.
2. Creare un branch dedicato da `dev`.
3. Sviluppare con Supabase locale (`npm run db:start`, `npm run db:reset`).
4. Testare (`npm run verify`, `npx supabase test db`, e2e se serve).
5. Commit chiari, push del branch.
6. Aprire PR verso `dev` con descrizione e istruzioni di test.
7. Con CI verde, abilitare l'auto-merge (squash) sulla PR.
8. La promozione `dev` → `main` è solo umana e solo dopo review.

## Escalation

Dubbio su sicurezza, RLS, chiavi, dati reali o produzione: fermarsi e chiedere all'umano. Non improvvisare.
