# Setup di sviluppo

Guida per preparare una macchina Omarchy/Arch al lavoro su `spesa`. Vale sia per il PC principale sia per il secondo PC.

## Prerequisiti

| Strumento    | Versione             | Note                      |
| ------------ | -------------------- | ------------------------- |
| Node         | 24 LTS               | pinnato in `.mise.toml`   |
| npm          | incluso con Node     | si usa `npm ci`, non pnpm |
| Docker       | recente              | serve a Supabase locale   |
| Supabase CLI | da `devDependencies` | `npx supabase`            |
| GitHub CLI   | recente              | per PR, issue, review     |
| git          | recente              | remote via SSH            |

La CLI Vercel è opzionale: il deploy normale avviene da GitHub. Serve solo se vuoi deployare a mano da quella macchina.

## Prima installazione

```bash
git clone git@github.com:sartosartofam/spesa.git
cd spesa
git switch dev
bash scripts/bootstrap.sh
```

`bootstrap.sh` è idempotente: installa Node via mise, `npm ci`, attiva gli hook, avvia Supabase locale, genera `.env.local` e lancia `npm run verify`.

## Docker

Supabase locale usa Docker. Se `docker info` dà "permission denied":

```bash
sudo usermod -aG docker "$USER"
```

Poi esci e rientra nella sessione (o riavvia). Verifica:

```bash
docker info
```

## Node

Il progetto pinna Node 24 LTS in `.mise.toml`:

```bash
mise install
node --version
```

Se mise non è attivo nella shell, aggiungi l'attivazione al profilo secondo la documentazione di mise.

## Supabase locale

```bash
npm run db:start     # avvia Postgres, Auth, REST, Studio
npm run env:local    # scrive .env.local con URL e anon key locali
npm run db:reset     # applica migrazioni + seed
```

- Studio: <http://127.0.0.1:54323>
- API: <http://127.0.0.1:54321>
- Mail locale (conferma email e magic link): <http://127.0.0.1:54324>

Le chiavi locali sono pubbliche e rigenerabili: non sono secret di produzione. `npm run env:local` evita di copiarle a mano.

### Seed e utenti di test

`npm run db:reset` applica migrazioni e `supabase/seed.sql`, poi crea gli utenti Auth demo con `scripts/seed-auth.mjs`. I dati sono fittizi e valgono solo per lo stack locale.

| Utente               | Password         | Ruolo  |
| -------------------- | ---------------- | ------ |
| `demo@spesa.test`    | `spesa-demo-123` | owner  |
| `partner@spesa.test` | `spesa-demo-123` | member |

La famiglia demo si chiama `Famiglia Demo` e contiene articoli in lista, urgenti e nello storico. Per ricreare solo gli utenti Auth dopo un `supabase db reset` eseguito senza lo script npm:

```bash
npm run db:seed
```

Lo script usa la `service_role` locale, rifiuta URL non locali e non stampa la chiave. Non usarlo mai contro la produzione.

### Registrazione pubblica e conferma email

La registrazione è aperta. Da `/register` si crea un account con nome, nome della famiglia, email e password. La configurazione locale ha:

- `[auth] enable_signup = true`;
- `[auth.email] enable_confirmations = true`;
- `minimum_password_length = 8`.

Dopo il signup Supabase invia un'email di conferma. In locale non serve SMTP: apri <http://127.0.0.1:54324>, prendi l'ultimo messaggio e clicca il link. Dopo la conferma accedi da `/login`.

Al primo accesso autenticato il frontend chiama la RPC `ensure_current_family()`: se l'utente non ha ancora una membership, crea una famiglia personale e lo inserisce come `owner`. La funzione è idempotente, quindi ricaricare o riaprire l'app non duplica la famiglia. Le email vengono normalizzate (trim + lowercase) nel client e dal trigger sul database.

In produzione l'attivazione di signup, conferma email e SMTP è un'azione umana. **La conferma email va testata con un indirizzo reale prima del push in produzione**; fino ad allora i test si fanno in locale con Mailpit.

Con `npm run dev`:

- `/` è la landing pubblica;
- `/login` è la pagina di accesso;
- `/register` è la pagina di registrazione;
- `/app` è l’area riservata e richiede una sessione attiva.

Per provare il login usa uno degli utenti demo qui sopra, oppure registra un nuovo account.

### Tipi TypeScript

Dopo una modifica a schema, policy o funzioni SQL:

```bash
npm run db:types
```

`npm run db:types` legge dallo stack locale, sovrascrive `src/lib/database.types.ts` e lo formatta con Biome. La generazione è riproducibile.

### Modalità dati (mock / Supabase)

Il repository viene scelto in `src/lib/data/index.ts`:

- con `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` presenti l'app usa Supabase (locale o cloud);
- `VITE_DATA_MODE=mock npm run dev` forza i dati locali in `localStorage`, senza rete;
- gli e2e usano sempre `VITE_DATA_MODE=mock` (vedi `playwright.config.ts`) e non chiamano REST;
- senza variabili la landing parte comunque e la UI usa il mock.

Il client e il repository sono creati in modo lazy: un ambiente non configurato non fa crashare la landing. Il merge dei duplicati è applicato lato client; il vincolo/trigger equivalente lato database resta un follow-up backend.

### Worktree paralleli

`supabase start` usa `project_id = "spesa"` e porte fisse (54321, 54322, 54323, 54324). Due worktree non possono girare insieme con la stessa configurazione: il secondo fallisce per conflitto di porte.

Per il parallelismo serve una config locale diversa per worktree (cambia `project_id`, `[api].port`, `[db].port`, `[studio].port`, `[local_smtp].port`) e **non** va committata. Per l'MVP la scelta consigliata resta un task alla volta, con un solo stack locale attivo.

## Comandi quotidiani

```bash
npm run dev          # Vite su http://localhost:5173
npm run verify       # lint + typecheck + unit + build
npm run test:e2e     # Playwright (prima: npx playwright install chromium)
npm run db:types     # rigenera i tipi TypeScript da Supabase locale
npx supabase test db # test pgTAP / RLS
```

## GitHub (una volta, dopo `gh auth login`)

```bash
bash scripts/setup-github.sh
```

Lo script crea label e issue di partenza. Poi imposta a mano, come stampato dallo script:

- default branch `dev`;
- auto-merge abilitato;
- branch protection su `main` e `dev` con CI obbligatoria;
- secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` per il keepalive.

Non abilitare "Require review from Code Owners" su `dev`: bloccherebbe l'auto-merge degli agenti.

## Hook git

Una volta per clone:

```bash
git config core.hooksPath .githooks
```

Il hook blocca i push diretti su `main`. È una rete di sicurezza locale, non sostituisce la branch protection di GitHub.

## Flusso Git

- `main` = produzione. Solo promozione umana.
- `dev` = integrazione. Le PR degli agenti arrivano qui.
- `feat/*`, `test/*`, `chore/*` = lavoro, creati da `dev`.
- Se la CI è verde, l'agente può abilitare l'auto-merge della PR su `dev`.
- `main` si aggiorna solo dopo review umana.

## Secret

Non ci sono secret condivisi tra le macchine.

- Chiavi locali Supabase: generate da `npm run env:local`, sono usa-e-getta.
- Chiavi cloud Supabase e Vercel: restano nelle dashboard dei provider e nelle variabili d'ambiente di Vercel/CI.
- `service_role` cloud: mai su una macchina di sviluppo, mai nel frontend, mai in Git.
- GitHub Actions: `SUPABASE_URL` e `SUPABASE_ANON_KEY` come repository secrets, solo per il keepalive.

`.env.local` è ignorato da Git. Non committare mai `.env`, `.env.local` o file con token.

## Secondo PC

Stessi passi della prima installazione. Non serve copiare file di secret: `npm run env:local` rigenera le chiavi locali, `gh auth login` autentica GitHub, `vercel login` serve solo se deployi da lì.

Controllo finale:

```bash
bash scripts/doctor.sh --verify
```

Se `doctor` segnala errori, sistemali prima di iniziare a lavorare: gli agenti si aspettano un ambiente verde.

## Troubleshooting

| Sintomo                             | Causa probabile                        | Rimedio                                  |
| ----------------------------------- | -------------------------------------- | ---------------------------------------- |
| `permission denied ... docker.sock` | utente fuori dal gruppo docker         | `sudo usermod -aG docker $USER`, rientra |
| `supabase start` non parte          | Docker spento o immagini non scaricate | `sudo systemctl start docker`, riprova   |
| `npm run env:local` fallisce        | stack locale non attivo                | `npm run db:start`                       |
| `npm run verify` fallisce su lint   | formattazione                          | `npm run lint:fix`                       |
| Playwright non trova il browser     | browser non installati                 | `npx playwright install chromium`        |
| `gh: not logged in`                 | login mancante                         | `gh auth login`                          |
| push su `main` bloccato             | hook pre-push                          | è voluto: lavora su `dev` o `feat/*`     |
