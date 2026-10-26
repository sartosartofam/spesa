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
- `minimum_password_length = 12`;
- `[auth.email] secure_password_change = true`.

Dopo il signup Supabase invia un'email di conferma. In locale non serve SMTP: apri <http://127.0.0.1:54324>, prendi l'ultimo messaggio e clicca il link. Dopo la conferma accedi da `/login`.

Al primo accesso autenticato il frontend chiama la RPC `ensure_current_family()`: se l'utente non ha ancora una membership, crea una famiglia personale e lo inserisce come `owner`. La funzione è idempotente, quindi ricaricare o riaprire l'app non duplica la famiglia. Le email vengono normalizzate (trim + lowercase) nel client e dal trigger sul database.

In produzione l'attivazione di signup, conferma email e SMTP è un'azione umana. **La conferma email va testata con un indirizzo reale prima del push in produzione**; fino ad allora i test si fanno in locale con Mailpit.

### Recupero password

Da `/login`, il link **Password dimenticata?** apre `/forgot-password`. Inserendo l'email, Supabase invia un link di recupero che riporta a `/reset-password`. In locale l'email si legge su Mailpit (<http://127.0.0.1:54324>), come per la conferma.

Il link contiene una sessione temporanea di recovery. La pagina `/reset-password` chiede una nuova password di almeno 12 caratteri e la salva con `updateUser`. Se il link è scaduto o manca la sessione, la pagina invita a richiederne uno nuovo. Per sicurezza il link è `noindex` e non viene mai mostrato nella UI.

La configurazione locale include già gli URL di redirect:

- `http://localhost:5173/reset-password`
- `http://127.0.0.1:5173/reset-password`

In produzione vanno aggiunti come redirect URL esatti nel progetto Supabase cloud, insieme al Site URL. Vedi [SECURITY.md](SECURITY.md).

Con `npm run dev`:

- `/` è la landing pubblica;
- `/login` è la pagina di accesso;
- `/register` è la pagina di registrazione;
- `/forgot-password` richiede il link di recupero;
- `/reset-password` imposta la nuova password dal link ricevuto;
- `/app` è l’area riservata e richiede una sessione attiva.

Per provare il login usa uno degli utenti demo qui sopra, oppure registra un nuovo account.

### Inviti e cambio famiglia

Da **Impostazioni → Famiglia** un membro autenticato può generare un codice invito monouso. Il codice scade dopo 7 giorni e va condiviso manualmente con la persona da invitare.

L'invitato accede o si registra, apre **Impostazioni → Famiglia**, incolla il codice e conferma. Dopo il cambio famiglia ricarica la lista per vedere i dati della nuova famiglia.

Nella stessa sezione l'`owner` vede i membri della famiglia e può usare **Rendi owner** per nominare un altro `owner` (RPC `promote_family_owner`). Serve quando l'owner vuole cambiare famiglia ma non è l'unico membro.

- Se l'invitato era l'unico membro della famiglia di partenza, la vecchia famiglia e la sua lista vengono eliminate.
- Se era `owner` con altri membri, il cambio è bloccato finché non nomina un altro `owner`.
- Gli inviti attivi creati dall'utente per la vecchia famiglia vengono revocati.
- La tabella `family_invites` non è leggibile dal client: creazione e riscatto passano solo dalle RPC `create_family_invite()` e `redeem_family_invite(code)`.

I test pgTAP coprono creazione, riscatto, codice scaduto, codice già usato, blocco dell'owner e utente senza membership.

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

### PWA e modalità offline

Il manifest è in `public/manifest.webmanifest` e usa icone PNG 192/512, una variante maskable e `apple-touch-icon.png`. Il service worker (`public/sw.js`) viene registrato **solo nella build di produzione** e mette in cache l'app shell e gli asset con hash letti da `index.html`.

- Il primo caricamento online prepara la shell; i successivi aggiornamenti usano network-first per le navigazioni e cache-first per gli asset.
- Le richieste REST/Auth/Realtime verso Supabase non passano mai dalla cache.
- In modalità Supabase l'ultima lista letta con successo viene salvata per famiglia in `localStorage`. Se il primo caricamento fallisce, l'app mostra l'ultima copia con un avviso offline. Logout e cambio famiglia cancellano queste copie.
- Non c'è una coda di scrittura: offline si consulta la lista, ma aggiunte e modifiche richiedono la rete.

Per provare la PWA:

```bash
npm run build
npm run preview
```

Apri <http://127.0.0.1:4173>, installa l'app dal browser e prova a ricaricare con la rete disattivata. In produzione serve HTTPS (localhost è ammesso per lo sviluppo). Le icone si rigenerano con `rsvg-convert` a partire da `public/icon.svg` e `public/icon-maskable.svg`; i PNG sono committati.

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
