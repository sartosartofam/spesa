# AGENTS.md

Leggere prima di agire. In caso di conflitto con l'utente, chiedere conferma.

## Contesto

Webapp familiare per la lista della spesa condivisa (fase 1: solo spesa; fase 2: faccende).

- Frontend: **Preact + Vite** (ADR-0005), PWA mobile-first.
- Backend/DB/Auth: Supabase (Postgres + Auth + REST + Realtime + RLS).
- Hosting: Vercel, deploy automatico da `main`; preview per le PR.
- Codebase: GitHub.
- Keepalive: due ping giornalieri indipendenti (Raspberry Pi + GitHub Actions).
- Backup: export settimanale su Cloudflare R2 / Backblaze B2 (ADR-0003).

Stato: la fase 1 è implementata e verificata in locale su `dev`; Supabase cloud e Vercel sono configurati; keepalive, backup e prima promozione su `main` non sono ancora attivi. Lo stato corrente sta solo in `docs/ROADMAP.md`: non duplicarlo altrove.

Nota: il workflow `keepalive` può risultare rosso perché il progetto Supabase è in pausa (nessun ping attivo). Non è un incidente da indagare e non richiede un task.

Leggere anche `docs/DECISIONS.md` (decisioni vincolanti) e `docs/ROADMAP.md` (stato e prossimi task).

## Branch, PR e autonomia

- `main` = produzione. Ci finisce solo ciò che l'umano promuove.
- `dev` = branch di integrazione: qui si mergiano le PR.
- `feat/*`, `test/*`, `chore/*` = lavoro degli agenti, sempre creati da `dev`.
- Push remoto consentito solo su `dev` e sui branch di lavoro. **Mai su `main`** senza ordine esplicita dell'umano.
- Gli agenti possono aprire PR verso `dev` e, con CI verde, abilitare l'auto-merge (squash) sulla PR. Vedi ADR-0004.
- La branch protection su `dev`/`main` **non è ancora attiva** (azione umana, vedi `docs/SECURITY.md`): finché manca, "CI verde prima del merge" è una regola di disciplina, non un blocco tecnico. Non approfittarne: aspettare la CI è comunque obbligatorio.
- Un task = una issue = un branch = una PR piccola. Non mescolare backend, frontend e refactor nello stesso branch.
- Un agente alla volta sugli stessi file. Parallelismo solo con worktree Git separati e un Supabase locale per worktree.

## Definition of done

Una PR è pronta solo se:

- `npm run verify` è verde (lint, typecheck, unit, build). La build include il budget gzip del bundle: se lo supera, va giustificato nella PR.
- Il comportamento nuovo o modificato ha un test.
- Le modifiche a schema o RLS hanno un test pgTAP (`npx supabase test db`).
- Le modifiche al livello dati hanno anche `npm run test:e2e:backend` verde (la suite non gira in CI: va lanciata a mano).
- Non ci sono secret, token, `.env` o dati reali nel diff.
- Nessuna credenziale o chiamata alla produzione.
- La PR descrive cosa cambia, come testarlo e cosa resta fuori.
- La CI è verde.

## Lavoro atomico e limiti di contesto

- Una issue alla volta, un branch alla volta. Non iniziare una seconda issue nello stesso branch.
- Ogni issue completata deve avere almeno un commit dedicato, pushato su `origin`.
- Lavorare a fette piccole e verticali: commit appena una parte è coerente e testata, senza aspettare la fine di tutto.
- Prima di esaurire il contesto, fermarsi su uno stato stabile: `npm run verify` verde, branch pushato, PR/issue aggiornata con ciò che resta.
- Non lasciare file a metà o branch solo locali: meglio una PR piccola e dichiarata incompleta che lavoro non recuperabile. Se un lavoro è incompleto, il branch va comunque pushato e marcato come tale nel commit e nella PR.
- Se una issue è troppo grande, spezzarla in sotto-task o PR più piccole invece di tenere un branch unico gigante.

## Ruoli

- **Backend**: schema DB, migrazioni, RLS, Edge Functions, script. Branch `feat/backend-*`.
- **Frontend**: UI, PWA, client Supabase, realtime. Branch `feat/frontend-*`.
- **QA/Test**: test e2e e e2e-backend, verifica RLS, test ripristino backup. Branch `test/*`.
- **Reviewer**: sola lettura, controlla sicurezza, RLS, test mancanti.
- **Umano**: account, autorizzazioni, review RLS, merge/promozione su `main`, deploy prod, branch protection, secret cloud.

## Sicurezza (non negoziabile)

1. `service_role` / `SECRET_KEY` mai nel frontend, in Git, in `.env` committato o nei log. Solo in env lato server (Edge Functions).
2. `anon` / `PUBLISHABLE_KEY` è l'unica chiave ammessa nel frontend e nel cron del Pi.
3. Ogni tabella deve avere RLS abilitata. Se manca, fermarsi e chiedere.
4. Nessuna operazione distruttiva (`DROP`, `DELETE` senza `WHERE`, `TRUNCATE`) senza conferma umana.
5. `.gitignore` deve includere `.env*`, `node_modules/`, `dist/`, `.vercel/`, `*.local`.
6. Nessun dato reale della famiglia in test o seed: usare dati fittizi.
7. Gli agenti usano solo Supabase locale. Nessuna chiave cloud, nessun `supabase link`, nessun `db push` verso la produzione.

## File ownership

- Backend: `supabase/migrations/*`, `supabase/functions/*`, `supabase/tests/*`, `supabase/seed.sql`, `scripts/backup/*`, `scripts/keepalive/*`.
- Frontend: `src/*`, `public/*`, `index.html`, `vite.config.*`, `package.json` (dipendenze frontend), `biome.json`, `vitest.config.ts`, `playwright*.config.ts`.
- QA/Test: `tests/*`, `e2e/*`, `e2e-backend/*`, `docs/test-*.md`.
- Solo umano: `AGENTS.md`, `README.md`, `.github/*`, `vercel.json`, `.env.example`, `.mise.toml`, `.githooks/*`.
- Condivisi (modificare solo se il task lo richiede, spiegando perché nella PR): `package.json`, `package-lock.json`, `scripts/*.sh|*.mjs` (dev e manutenzione), `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/SETUP.md`, `docs/SECURITY.md`.

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
family_invites (id, family_id, code_hash, created_by, created_at, expires_at, used_at)
user_settings (user_id, settings, updated_at)
rate_limits (key, count, window_start)
keepalive (id, last_ping)
```

- `status`: `to_buy` | `bought` (ADR-0001).
- `urgent = true`: segnalazione "è finito", notifica e priorità in lista.
- Query su `items`/`members` sempre filtrate per `family_id` via RLS.
- `family_invites` non è accessibile dal client: solo dalle RPC `create_family_invite()` e `redeem_family_invite(code)`.
- `user_settings` è self-only (una riga per utente autenticato).
- `rate_limits` ha RLS attiva e nessuna policy: la usa solo il `service_role` tramite `consume_rate_limit`.
- `keepalive` è pubblica in sola lettura (`select` ad `anon`), niente altro.

## Comandi utili

```bash
npm ci
npm run dev            # Supabase locale (se serve) + Vite
npm run dev:web        # solo Vite
npm run verify         # lint + typecheck + unit + build
npm run build          # build in dist/ (include il budget del bundle)
npm run preview        # serve la build
npm run test           # unit (Vitest)
npm run test:e2e       # e2e mock (Playwright, gira in CI)
npm run test:e2e:backend  # e2e contro Supabase locale (non in CI)
npx supabase test db   # pgTAP / RLS
npm run db:start       # avvia lo stack Supabase locale
npm run db:stop
npm run db:reset       # migrazioni + seed + utenti demo
npm run db:seed        # ricrea solo gli utenti Auth demo
npm run db:types       # rigenera i tipi TypeScript
npm run env:local
npm run lint:fix
git config core.hooksPath .githooks   # una volta per clone
```

`supabase` è una devDependency: usare `npx supabase`, non installazioni globali.

## Ambiente locale e carico della macchina

`npm run dev` avvia anche lo stack Supabase locale, non solo Vite. Lo script
`scripts/dev.sh`:

1. esegue `supabase start` tramite `scripts/db-start.sh` (idempotente: se lo
   stack è già attivo risponde in meno di un secondo);
2. riporta a `no` la restart policy dei container del progetto, così un
   riavvio del PC non li riaccende da solo;
3. rigenera `.env.local` solo se manca o se lo stack è appena partito;
4. lancia Vite passandogli gli argomenti (`npm run dev -- --host`).

Regole per gli agenti:

- Non reintrodurre `restart: unless-stopped` o `restart: always` nei
  container, e non aggiungere unit systemd, hook o script che avviano
  Supabase all'accensione: lo stack si avvia solo su richiesta.
- Se serve solo il database: `npm run db:start` (stesso `db-start.sh`, senza
  Vite). A fine lavoro: `npm run db:stop`.
- Per lavorare solo sul frontend: `npm run dev:web`.

Perché: i container Supabase nascono con `restart=unless-stopped`, quindi
partivano al boot insieme alla sessione grafica. Su un laptop con 8 thread
gli otto container attivi (Postgres, Auth, REST, Realtime, Studio, Kong,
Mailpit, pg-meta) saturano CPU e disco proprio nei primi secondi dopo il
login: qui la shell restava bloccata ~25 s con lo schermo nero. Lo stesso
vale, in generale, su portatili con poca RAM, macchine condivise e runner
CI: un servizio pesante va acceso quando serve e spento quando non serve.

## Divieti

- **Mai `git push` o merge su `main`.** La produzione Vercel si deploya da `main` e i deploy gratuiti sono limitati. Il lavoro viaggia su `dev` e sui branch `feat/*`, `test/*`, `chore/*`.
- **Niente emoji nell'interfaccia.** Usare icone SVG stilizzate e coerenti, con `aria-hidden` sull'icona e una label accessibile sul bottone.
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
4. Testare (`npm run verify`, `npx supabase test db`, `npm run test:e2e`, e `npm run test:e2e:backend` se il livello dati cambia).
5. Commit chiari, push del branch.
6. Aprire PR verso `dev` con descrizione e istruzioni di test.
7. Con CI verde, abilitare l'auto-merge (squash) sulla PR.
8. La promozione `dev` → `main` è solo umana e solo dopo review.

## Escalation

Dubbio su sicurezza, RLS, chiavi, dati reali o produzione: fermarsi e chiedere all'umano. Non improvvisare.
