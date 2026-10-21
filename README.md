# spesa

Webapp familiare per la lista della spesa condivisa. Fase 1: solo spesa (fase 2: faccende).

Stato: **Fase 0 completata — repository pronto per gli agenti**. Lo scaffold frontend (Preact + Vite, dati mock) è su `dev`; il backend Supabase è il prossimo passo. Vedi [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

| Componente          | Scelta                                               |
| ------------------- | ---------------------------------------------------- |
| Frontend            | Preact + Vite, PWA mobile-first                      |
| Hosting             | Vercel (Hobby), deploy da Git                        |
| Backend / DB / Auth | Supabase (Postgres + Auth + REST + Realtime + RLS)   |
| Codebase            | GitHub                                               |
| Keepalive           | Raspberry Pi + GitHub Actions (due ping giornalieri) |
| Backup              | Export settimanale su Cloudflare R2 / Backblaze B2   |

## Struttura

```
.
├── AGENTS.md                    # regole per gli agenti (leggere prima di agire)
├── README.md
├── .mise.toml                   # Node 24 LTS
├── .env.example                 # variabili richieste, senza valori reali
├── biome.json                   # lint + format
├── vitest.config.ts             # unit test
├── playwright.config.ts         # e2e
├── e2e/                         # test Playwright
├── docs/
│   ├── studio-di-progetto.md    # documento di progetto (fonte)
│   ├── studio-di-progetto.docx  # stessa versione in Word
│   ├── DECISIONS.md             # ADR: stato articoli, auth, backup, autonomia
│   ├── ROADMAP.md               # fasi e backlog
│   └── SETUP.md                 # setup macchina di sviluppo
├── scripts/
│   ├── bootstrap.sh             # setup idempotente
│   ├── doctor.sh                # diagnostica ambiente
│   ├── dev-env.sh               # genera .env.local da Supabase locale
│   └── keepalive/ping.sh        # ping giornaliero dal Raspberry Pi
├── src/                         # frontend Preact
├── supabase/
│   ├── config.toml              # configurazione stack locale
│   ├── migrations/              # migrazioni SQL (keepalive già pronta)
│   ├── seed.sql                 # seed locale (da popolare in Fase 1)
│   └── tests/                   # test pgTAP
└── .github/workflows/
    ├── ci.yml                   # lint, typecheck, unit, build, pgTAP, e2e
    └── keepalive.yml            # secondo ping, da GitHub Actions
```

## Setup locale

Prerequisiti: Node 24 LTS, npm, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli) (arriva con `npm ci`), GitHub CLI.

```bash
git clone git@github.com:sartosartofam/spesa.git
cd spesa
git switch dev
bash scripts/bootstrap.sh
```

Oppure a mano:

```bash
npm ci
npm run db:start
npm run env:local
npm run db:reset
npm run dev
```

Dettagli, secondo PC e troubleshooting: [docs/SETUP.md](docs/SETUP.md).

## Comandi

| Comando                           | Cosa fa                                  |
| --------------------------------- | ---------------------------------------- |
| `npm run dev`                     | Vite su <http://localhost:5173>          |
| `npm run verify`                  | lint + typecheck + unit + build          |
| `npm run test:e2e`                | Playwright                               |
| `npm run db:start`                | avvia Supabase locale                    |
| `npm run db:reset`                | migrazioni + seed                        |
| `npm run db:types`                | tipi TypeScript da Supabase locale       |
| `npm run env:local`               | scrive `.env.local` con le chiavi locali |
| `npx supabase test db`            | test pgTAP / RLS                         |
| `bash scripts/doctor.sh --verify` | diagnostica ambiente + verify            |

## Variabili d'ambiente

| Variabile                       | Dove              | Note                                  |
| ------------------------------- | ----------------- | ------------------------------------- |
| `VITE_SUPABASE_URL`             | frontend          | pubblica, finisce nel bundle          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend          | pubblica (anon / publishable key)     |
| `SUPABASE_URL`                  | CI e Raspberry Pi | usata dal keepalive                   |
| `SUPABASE_ANON_KEY`             | CI e Raspberry Pi | usata dal keepalive                   |
| `SUPABASE_SECRET_KEY`           | solo server/CI    | **mai** nel frontend, in Git o sul Pi |

Per lo sviluppo locale non serve copiare chiavi: `npm run env:local` legge `supabase status` e genera `.env.local` (ignorato da Git). Le chiavi cloud restano nelle dashboard di Supabase/Vercel.

Su GitHub, per il workflow keepalive, impostare i secret `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).

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

Dettaglio delle regole e dei ruoli: [AGENTS.md](AGENTS.md). Decisioni: [docs/DECISIONS.md](docs/DECISIONS.md).

## Keepalive

Supabase mette in pausa i progetti dopo 7 giorni di inattività. Sono attivi due ping indipendenti:
1. **Raspberry Pi**, cron giornaliero: `scripts/keepalive/ping.sh`.
2. **GitHub Actions**, workflow schedulato: `.github/workflows/keepalive.yml`.

Entrambi interrogano la tabella `keepalive` (`select` su `/rest/v1/keepalive`), non un endpoint di health check: solo una query reale resetta il timer. La tabella e le policy sono in `supabase/migrations/20261021120000_keepalive.sql`.

Nota: GitHub esegue i workflow schedulati solo sul branch di default del repository. Con `dev` come default, il workflow deve esistere su `dev` (è così). Il branch di produzione Vercel resta `main`.

Esempio di crontab sul Pi:

```
0 3 * * * /path/to/spesa/scripts/keepalive/ping.sh >> /var/log/spesa-keepalive.log 2>&1
```

## Backup

Export settimanale automatico dal Raspberry Pi verso Cloudflare R2 o Backblaze B2, in pipe e senza scrittura sulla SD. Meccanismo scelto: Edge Function `export` con token dedicato (ADR-0003). La `service_role` resta solo lato Supabase.

## Documentazione

- [docs/studio-di-progetto.md](docs/studio-di-progetto.md) — studio completo: architettura, dati, sicurezza, costi, rischi, definition of done.
- [docs/DECISIONS.md](docs/DECISIONS.md) — decisioni vincolanti (ADR).
- [docs/ROADMAP.md](docs/ROADMAP.md) — fasi e backlog.
- [docs/SETUP.md](docs/SETUP.md) — setup macchina.
- [AGENTS.md](AGENTS.md) — regole operative, ownership dei file, divieti.
