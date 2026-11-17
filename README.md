# spesa

Webapp familiare per la lista della spesa condivisa, mobile-first e installabile come PWA.

**Stato.** Fase 1 (lista della spesa) implementata e verificata in locale su `dev`: schema, RLS, auth, inviti, realtime, PWA, export. Backend Supabase cloud e progetto Vercel configurati. Non ancora attivi in produzione: keepalive, backup automatico e la prima promozione su `main`, che è ancora fermo all'initial commit.

Cosa manca e in che ordine: [docs/ROADMAP.md](docs/ROADMAP.md) → Fase 3. Bloccanti di sicurezza: [docs/SECURITY.md](docs/SECURITY.md).

## Stack

| Componente          | Scelta                                                       |
| ------------------- | ------------------------------------------------------------ |
| Frontend            | Preact + Vite, PWA mobile-first (ADR-0005)                   |
| Hosting             | Vercel (Hobby), deploy da Git                                |
| Backend / DB / Auth | Supabase (Postgres + Auth + REST + Realtime + RLS)           |
| Codebase            | GitHub                                                       |
| Keepalive           | Raspberry Pi + GitHub Actions (due ping indipendenti)        |
| Backup              | Export settimanale su Cloudflare R2 / Backblaze B2 (ADR-0003) |

## Struttura

```
.
├── AGENTS.md                    # regole per gli agenti (leggere prima di agire)
├── src/                         # frontend Preact: pagine, componenti, hook, lib
├── public/                      # manifest, service worker, icone, immagini OG
├── supabase/
│   ├── config.toml              # configurazione dello stack locale
│   ├── migrations/              # migrazioni SQL
│   ├── functions/               # Edge Functions: send-push, export
│   ├── seed.sql                 # dati fittizi per lo sviluppo
│   └── tests/                   # test pgTAP (RLS, RPC, vincoli)
├── e2e/                         # Playwright con dati mock (gira in CI)
├── e2e-backend/                 # Playwright contro lo stack Supabase locale
├── scripts/                     # dev, database, seed, doctor, backup, keepalive
├── docs/                        # ROADMAP, DECISIONS, SETUP, SECURITY + archivio storico
└── .github/workflows/           # ci.yml, keepalive.yml
```

## Setup locale

Prerequisiti: Node 24 LTS (pinnato in `.mise.toml`), npm, Docker, GitHub CLI. La CLI Supabase arriva con `npm ci`.

```bash
git clone git@github.com:sartosartofam/spesa.git
cd spesa
git switch dev
bash scripts/bootstrap.sh
```

`bootstrap.sh` è idempotente: installa Node via mise, esegue `npm ci`, attiva gli hook, avvia Supabase locale, genera `.env.local` e lancia `npm run verify`.

Oppure a mano:

```bash
npm ci
npm run db:start     # Supabase locale su richiesta, non al boot
npm run env:local
npm run db:reset
npm run dev
```

Dettagli, utenti demo, secondo PC e troubleshooting: [docs/SETUP.md](docs/SETUP.md).

## Comandi

| Comando                  | Cosa fa                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `npm run dev`            | Supabase locale (se serve) + Vite su <http://localhost:5173>  |
| `npm run dev:web`        | solo Vite, senza toccare lo stack                             |
| `npm run build`          | typecheck + build in `dist/` (con budget del bundle)          |
| `npm run preview`        | serve la build su <http://127.0.0.1:4173>                     |
| `npm run verify`         | lint + typecheck + unit + build                               |
| `npm run test`           | unit test (Vitest)                                            |
| `npm run test:e2e`       | Playwright con dati mock (la suite della CI)                  |
| `npm run test:e2e:backend` | Playwright contro Supabase locale                           |
| `npx supabase test db`   | test pgTAP / RLS                                              |
| `npm run db:start`       | avvia lo stack Supabase locale                                |
| `npm run db:stop`        | spegne lo stack                                               |
| `npm run db:reset`       | migrazioni + seed + utenti demo                               |
| `npm run db:seed`        | ricrea solo gli utenti Auth demo                              |
| `npm run db:types`       | rigenera `src/lib/database.types.ts` da Supabase locale        |
| `npm run env:local`      | scrive `.env.local` con URL e chiavi locali                   |
| `npm run lint:fix`       | applica lint e formattazione (Biome)                          |
| `bash scripts/doctor.sh --verify` | diagnostica ambiente + verify                        |

## Variabili d'ambiente

| Variabile                       | Dove              | Note                                            |
| ------------------------------- | ----------------- | ----------------------------------------------- |
| `VITE_SUPABASE_URL`             | frontend          | pubblica, finisce nel bundle                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend          | pubblica (anon / publishable key)               |
| `VITE_DATA_MODE`                | frontend          | `mock` per lavorare senza rete                  |
| `VITE_SITE_URL`                 | frontend          | dominio di produzione: canonical, OG e sitemap  |
| `VITE_VAPID_PUBLIC_KEY`         | frontend          | solo se il Web Push viene attivato (oggi spento) |
| `SUPABASE_URL`                  | CI e Raspberry Pi | usata dal keepalive                             |
| `SUPABASE_ANON_KEY`             | CI e Raspberry Pi | usata dal keepalive                             |
| `EXPORT_TOKEN`                  | secret function   | token dedicato della Edge Function `export`     |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | secret function | solo Edge Function `send-push` |
| `SUPABASE_SECRET_KEY`           | solo server       | **mai** nel frontend, in Git o sul Pi           |

Per lo sviluppo locale non serve copiare chiavi: `npm run env:local` legge `supabase status` e scrive `.env.local` (ignorato da Git). Le chiavi cloud restano nelle dashboard di Supabase e Vercel.

## Flusso Git e deploy

- `main` = **produzione** (Vercel production). Riceve solo promozioni fatte dall'umano.
- `dev` = branch di integrazione, dove si mergiano le PR. È il branch di default su GitHub.
- `feat/*`, `test/*`, `chore/*` = lavoro degli agenti, creati da `dev`.
- Push remoto **solo** su `dev` e sui branch di lavoro: mai su `main`, salvo ordine esplicita dell'umano.
- Con CI verde, gli agenti possono abilitare l'auto-merge (squash) della PR su `dev`. La promozione su `main` resta umana.

Hook locale (una volta per clone) che blocca i push su `main`:

```bash
git config core.hooksPath .githooks
```

Regole e ruoli: [AGENTS.md](AGENTS.md). Decisioni: [docs/DECISIONS.md](docs/DECISIONS.md).

## Keepalive

Supabase Free mette in pausa un progetto dopo circa 7 giorni senza attività, e un progetto in pausa non risolve più il DNS: l'app smette di funzionare finché non lo si riattiva dal dashboard.

Sono previsti due ping indipendenti che interrogano la tabella `keepalive` (`select` su `/rest/v1/keepalive`, non un health check: solo una query reale resetta il timer):

1. **Raspberry Pi**, cron giornaliero: `scripts/keepalive/ping.sh`.
2. **GitHub Actions**, workflow schedulato: `.github/workflows/keepalive.yml`.

**Stato: non ancora attivi.** Nessuno dei due ping è in funzione, quindi il progetto cloud si sospende da solo e il workflow `keepalive` risulta rosso ogni notte: è il sintomo atteso, non un guasto. L'ordine per attivarli è in [docs/ROADMAP.md](docs/ROADMAP.md) → Fase 3 (riattivare il progetto, verificare i secret, avviare i due ping).

Esempio di crontab sul Pi:

```
0 3 * * * /path/to/spesa/scripts/keepalive/ping.sh >> /var/log/spesa-keepalive.log 2>&1
```

## Backup

Export automatico dal Raspberry Pi verso Cloudflare R2 o Backblaze B2, in pipe e senza scrittura sulla SD. Meccanismo: Edge Function `export` con token dedicato (ADR-0003); la `service_role` resta solo lato Supabase e il Pi chiama solo la function. Come provarlo in locale: [docs/SETUP.md](docs/SETUP.md) → "Backup e restore". Il cron di produzione non è ancora attivo.

## Documentazione

- [docs/ROADMAP.md](docs/ROADMAP.md) — stato, backlog e checklist di go-live (unica fonte di verità).
- [docs/SECURITY.md](docs/SECURITY.md) — cosa è già protetto e bloccanti prima del go-live.
- [docs/SETUP.md](docs/SETUP.md) — setup della macchina, test, PWA, push, backup in locale.
- [docs/DECISIONS.md](docs/DECISIONS.md) — decisioni vincolanti (ADR).
- [docs/studio-di-progetto.md](docs/studio-di-progetto.md) — studio iniziale, storico: in caso di conflitto prevale la roadmap.
- [AGENTS.md](AGENTS.md) — regole operative, ownership dei file, divieti.
