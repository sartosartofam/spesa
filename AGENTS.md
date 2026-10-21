# AGENTS.md

Leggere prima di agire. In caso di conflitto con l'utente, chiedere conferma.

## Contesto
Webapp familiare lista spesa condivisa (fase 1: solo spesa; fase 2: faccende).
- Frontend: PWA mobile-first (SvelteKit o Preact + Vite) su Vercel.
- Backend/DB/Auth: Supabase (Postgres + Auth + REST + RLS).
- Codebase: GitHub, deploy automatico su Vercel da `main`.
- Keepalive: due ping giornalieri indipendenti (Raspberry Pi + GitHub Actions).
- Backup: export settimanale su Cloudflare R2 / Backblaze B2, senza scrittura locale sul Pi.

## Branch e deploy
- `main` = produzione (Vercel production). Ci finisce solo ciò che l'umano promuove.
- `dev` = branch di integrazione: qui si mergiano le PR.
- `feat/*`, `test/*` = lavoro degli agenti, sempre da `dev`.
- Push remoto consentito solo su `dev` e sui branch di lavoro. **Mai su `main`** senza ordine esplicita dell'umano: i deploy gratuiti sono limitati.

## Ruoli (lavoro in sequenza, mai in parallelo)
- Agente Backend: schema DB, RLS, Edge Functions, API. Branch `feat/backend-*`.
- Agente Frontend: UI, PWA, Supabase client, realtime. Branch `feat/frontend-*`.
- Agente QA/Test: test e2e, verifica RLS, test ripristino backup. Branch `test/*`.
- Umano: account, autorizzazioni, revisione, merge su `dev`, promozione `dev` → `main`, deploy prod.

## Sicurezza (non negoziabile)
1. `service_role`/`SECRET_KEY` mai nel frontend, in Git, in `.env` committato o nei log. Solo in env lato server.
2. `anon`/`PUBLISHABLE_KEY` unica chiave ammessa nel frontend e nel cron del Pi.
3. Ogni tabella deve avere RLS abilitata. Se manca, fermarsi e chiedere.
4. Nessuna operazione distruttiva (`DROP`, `DELETE` senza `WHERE`, `TRUNCATE`) senza conferma umana.
5. `.gitignore` deve includere `.env*`, `node_modules/`, `dist/`, `.vercel/`, `*.local`.
6. Nessun dato reale della famiglia in test o seed: usare dati fittizi.

## File ownership
- Backend: `supabase/migrations/*`, `supabase/functions/*`, `scripts/backup/*`, `scripts/keepalive/*`.
- Frontend: `src/*`, `public/*`, `index.html`, `vite.config.*`, `package.json` (solo dipendenze frontend).
- QA/Test: `tests/*`, `e2e/*`, `docs/test-*.md`.
- Solo umano: `AGENTS.md`, `README.md`, `.github/*`, `vercel.json`, `.env.example`.
Se serve modificare un file non proprio, fermarsi e chiedere.

## Schema dati (fase 1)

families (id, name, created_at)
members (id, family_id, email, display_name, role, created_at)
items (id, family_id, name, category, status, note, quantity,
created_by, created_at, updated_at, bought_at)
keepalive (id, last_ping)

- `status`: `to_buy` | `bought` | `finished`. `finished` = "è finito" + notifica. `bought` = archiviato ma in storico.
- Query su `items`/`members` sempre filtrate per `family_id` via RLS.
- `keepalive` pubblica in sola lettura (`select` ad `anon`), niente altro.

## Comandi utili

supabase start
supabase db reset
supabase migration new <nome>
supabase link --project-ref <ref>
supabase db push
npm install && npm run dev && npm run build && npm run test
npx supabase start
git config core.hooksPath .githooks   # attiva il blocco push su main


## Divieti
- **Mai `git push` su `main`.** La produzione Vercel si deploya da `main` e i deploy gratuiti sono limitati: push/merge su `main` solo se l'umano lo chiede esplicitamente. Il lavoro viaggia su `dev` e sui branch `feat/*`, `test/*`.
- Niente commit diretti su `main`; niente chiavi/token/`.env` committati.
- Non disabilitare RLS per "far funzionare le cose".
- Non usare `service_role` nel frontend.
- Non modificare `AGENTS.md`/`README.md` senza istruzione umana.
- Niente `git push --force` su branch condivisi.
- Non assumere deploy ok: verificare log Vercel.
- Non toccare Supabase di produzione senza autorizzazione esplicita.

## Flusso standard
1. Leggere `AGENTS.md` e `README.md`.
2. Checkout branch dedicato.
3. Sviluppare con Supabase locale (`supabase start`).
4. Testare (inclusa verifica RLS per backend).
5. Commit chiari, push branch.
6. Aprire PR verso `dev` con descrizione e istruzioni di test.
7. Attendere revisione e merge dell'umano su `dev`. La promozione su `main` è solo umana e solo su richiesta esplicita.

## Escalation
Dubbio su sicurezza, RLS, chiavi o dati reali: fermarsi e chiedere all'umano. Non improvvisare.
