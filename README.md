# spesa

Webapp familiare per la lista della spesa condivisa. Fase 1: solo spesa (fase 2: faccende).

Stato: **pre-MVP**, repository in preparazione. Il codice applicativo non è ancora stato creato: qui ci sono documentazione, linee guida per gli agenti, schema keepalive e workflow di servizio.

## Stack

| Componente | Scelta |
|---|---|
| Frontend | PWA mobile-first (SvelteKit o Preact + Vite) |
| Hosting | Vercel (Hobby), deploy da Git |
| Backend / DB / Auth | Supabase (Postgres + Auth + REST + RLS) |
| Codebase | GitHub |
| Keepalive | Raspberry Pi + GitHub Actions (due ping giornalieri) |
| Backup | Export settimanale su Cloudflare R2 / Backblaze B2 |

## Struttura

```
.
├── AGENTS.md                    # regole per gli agenti (leggere prima di agire)
├── README.md
├── .env.example                 # variabili richieste, senza valori reali
├── docs/
│   ├── studio-di-progetto.md    # documento di progetto (fonte)
│   └── studio-di-progetto.docx  # stessa versione in Word
├── supabase/migrations/         # migrazioni SQL (keepalive già pronta)
├── scripts/keepalive/ping.sh    # ping giornaliero dal Raspberry Pi
└── .github/workflows/keepalive.yml  # secondo ping, da GitHub Actions
```

## Setup locale

Prerequisiti: Node 20+, npm, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
cp .env.example .env.local     # poi compilare con i valori del progetto
npm install                    # quando package.json esisterà
npx supabase start             # stack locale (Postgres, Auth, REST)
npx supabase db reset          # applica le migrazioni locali
npm run dev
```

L'app non è ancora scaffoldata: i comandi npm saranno disponibili dopo la prima fase di sviluppo.

## Variabili d'ambiente

| Variabile | Dove | Note |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | pubblica, finisce nel bundle |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | pubblica (anon / publishable key) |
| `SUPABASE_URL` | CI e Raspberry Pi | usata dal keepalive |
| `SUPABASE_ANON_KEY` | CI e Raspberry Pi | usata dal keepalive |
| `SUPABASE_SECRET_KEY` | solo server/CI | **mai** nel frontend, in Git o sul Pi |

`.env.local` è ignorato da Git. Nessuna credenziale reale va committata: `.env.example` contiene solo segnaposto.

Su GitHub, per il workflow keepalive, impostare i secret `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).

## Flusso Git e deploy

- `main` = **produzione** (Vercel production). Riceve solo promozioni fatte dall'umano.
- `dev` = branch di integrazione, dove si mergiano le PR.
- `feat/*`, `test/*` = lavoro degli agenti, creati da `dev`.
- Push remoto **solo** su `dev` e sui branch di lavoro: mai su `main`, salvo ordine esplicita dell'umano. I deploy gratuiti di Vercel sono limitati.
- Ogni PR genera un Preview Deployment; il merge su `dev` non tocca la produzione.

Dettaglio delle regole e dei ruoli: [AGENTS.md](AGENTS.md).

## Keepalive

Supabase mette in pausa i progetti dopo 7 giorni di inattività. Sono attivi due ping indipendenti:

1. **Raspberry Pi**, cron giornaliero: `scripts/keepalive/ping.sh`.
2. **GitHub Actions**, workflow schedulato: `.github/workflows/keepalive.yml`.

Entrambi interrogano la tabella `keepalive` (`select` su `/rest/v1/keepalive`), non un endpoint di health check: solo una query reale resetta il timer. La tabella e le policy sono in `supabase/migrations/20261021120000_keepalive.sql`.

Esempio di crontab sul Pi:

```
0 3 * * * /path/to/spesa/scripts/keepalive/ping.sh >> /var/log/spesa-keepalive.log 2>&1
```

## Backup

Export settimanale automatico dal Raspberry Pi verso Cloudflare R2 o Backblaze B2, in pipe e senza scrittura sulla SD. Il meccanismo di autenticazione dell'export è da definire in implementazione (Edge Function con token dedicato oppure `pg_dump`): la sola anon key non basta se la RLS limita la lettura ai membri autenticati. Dettagli e stato delle decisioni in `docs/studio-di-progetto.md` (§5.8 e addendum A1).

## Documentazione

- `docs/studio-di-progetto.md` — studio completo: architettura, dati, sicurezza, agenti, costi, rischi, definition of done.
- `docs/studio-di-progetto.docx` — stessa versione impaginata.
- `AGENTS.md` — regole operative, ownership dei file, divieti.
