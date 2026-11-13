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

### Web Push

Le notifiche push sono implementate ma **spente finché non vengono configurate le chiavi VAPID**. Senza `VITE_VAPID_PUBLIC_KEY` la sezione **Impostazioni → Notifiche** resta nascosta e l'app non chiama la Edge Function.

Il flusso è questo:

- il browser crea una `PushSubscription` e la salva in `push_subscriptions` (RLS self-only);
- dopo un'aggiunta riuscita o il passaggio di `urgent` da `false` a `true`, il client chiama la Edge Function `send-push`;
- la function verifica il JWT, controlla che l'utente appartenga alla famiglia dell'articolo, esclude l'autore e invia solo alle subscription degli altri membri;
- la function usa `service_role` solo lato server, applica un'allowlist agli endpoint push noti, valida le chiavi e cancella le subscription che rispondono `404`/`410`;
- la notifica è best-effort: un errore push non blocca l'azione sulla lista;
- l'invio è limitato a 12 richieste al minuto per utente: oltre il budget la function risponde `429 rate_limited` e non invia nulla. Il budget è contato dalla RPC `consume_rate_limit` (`security definer`, eseguibile solo da `service_role`); la tabella dei contatori ha RLS attiva e nessuna policy, quindi è invisibile ai ruoli API.

Il payload contiene solo titolo, testo breve, `itemId` e il percorso `/app`. Non contiene email, note o altri dati sensibili. Il click sulla notifica apre l'app.

#### Configurazione locale

Genera una coppia VAPID usa-e-getta:

```bash
npx web-push generate-vapid-keys --json
```

Copia la chiave pubblica in `.env.local`:

```bash
VITE_VAPID_PUBLIC_KEY=<chiave-pubblica>
```

Poi crea `supabase/functions/.env` (ignorato da Git) con i tre valori lato server:

```bash
VAPID_PUBLIC_KEY=<chiave-pubblica>
VAPID_PRIVATE_KEY=<chiave-privata>
VAPID_SUBJECT=mailto:tuo-indirizzo@example.test
```

Avvia lo stack e la function:

```bash
npm run db:start
npx supabase functions serve send-push --env-file supabase/functions/.env
```

La function ascolta su `http://127.0.0.1:54321/functions/v1/send-push`. Con `verify_jwt = true` in `supabase/config.toml`, il gateway richiede il JWT della sessione. Se le chiavi VAPID mancano, la function risponde con `{ ok: true, skipped: true, reason: "push_not_configured" }` senza inviare nulla.

Per provare davvero l'opt-in serve la build di produzione, perché il service worker è registrato solo lì:

```bash
npm run build
npm run preview
```

Apri <http://127.0.0.1:4173>, accedi, apri **Impostazioni → Notifiche** e attiva il dispositivo. Su iPhone le notifiche funzionano solo dopo aver aggiunto l'app alla schermata Home (iOS 16.4 o successivo). Il browser deve supportare `PushManager` e la pagina deve essere in un contesto sicuro: `localhost` va bene, un IP in HTTP no.

Note:

- in modalità mock o senza chiave VAPID la sezione Notifiche non compare;
- non c'è una coda offline: se la rete manca, la notifica viene semplicemente persa;
- logout e cancellazione account disiscrivono il dispositivo e rimuovono la riga server;
- gli e2e verificano solo il feature gate, perché non hanno chiavi VAPID e non possono ricevere push reali.

#### Produzione (azione umana)

1. Genera le chiavi VAPID definitive e conserva la privata solo nei secret Supabase.
2. Su Vercel aggiungi la sola variabile pubblica `VITE_VAPID_PUBLIC_KEY`.
3. Su Supabase imposta i secret `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` per la Edge Function.
4. Fai il deploy della function `send-push` con il flusso di release scelto.
5. Prova l'opt-in da un dispositivo reale e verifica la notifica su aggiunta e su urgenza.

**Mai** mettere `VAPID_PRIVATE_KEY` nel frontend, in Vercel o in Git. La chiave pubblica è pubblica per definizione; la privata resta solo nella Edge Function.

### Backup e restore (ADR-0003)

La Edge Function `supabase/functions/export/index.ts` produce lo snapshot JSON delle tabelle applicative (`families`, `members`, `items`, `family_invites`, `push_subscriptions`, `user_settings`, `keepalive`). L'autenticazione è un token dedicato (secret `EXPORT_TOKEN`), **non** un JWT utente: `verify_jwt` è disattivato solo per questa function. Il chiamante (in produzione un cron del Pi) poi carica il JSON su R2/B2.

In locale:

```bash
printf 'EXPORT_TOKEN=chiave-fittizia-local\n' > /tmp/opencode/export.env
npx supabase functions serve export --env-file /tmp/opencode/export.env

curl -s -X POST http://127.0.0.1:54321/functions/v1/export \
  -H 'authorization: Bearer chiave-fittizia-local' > export.json
```

Senza env-file la function risponde `503 export_not_configured`; con token assente o sbagliato risponde `401`.

Il ripristino di prova è lo script `scripts/backup/restore-local.mjs`, solo per Supabase locale (rifiuta URL non locali) e con `service_role` letta da `supabase status`:

```bash
npm run db:reset
node scripts/backup/restore-local.mjs export.json
```

Lo script fa upsert in ordine di dipendenza e stampa i conteggi per tabella. Limiti dichiarati del restore:

- **`auth.users` non è nell'export**: lo schema `auth` non è percorribile via REST, nemmeno con `service_role`. Dopo un restore reale vanno ricreati gli account Auth con gli stessi id (admin API) e fatta ripartire la password con l'email di reset.
- `rate_limits` non è nell'export: è contatore runtime, non dato.
- Le email dei membri ci sono (per il restore), ma nel normale uso l'app non mostra mai email altrimenti.

In produzione (azione umana):

1. Imposta il secret `EXPORT_TOKEN` (almeno 32 byte casuali) nei secret Supabase della function.
2. Fai il deploy della function `export`.
3. Programma il cron del Pi: `POST` con `Authorization: Bearer <EXPORT_TOKEN>`, salvataggio del JSON e upload su bucket R2/B2 cifrato (per esempio con `rclone`).
4. Monitora i `4xx`/`5xx` del cron; ruota il token se esposto.

Mai `service_role` sul Pi: chiama solo la function col token.

### SEO, Open Graph e sitemap

La landing e `/privacy` sono indicizzabili; tutte le altre viste sono `noindex, nofollow` (già da `private-noindex.js` e `useDocumentMeta`). Il dominio di produzione non è ancora stato scelto: quando lo sarà, aggiungere **una sola variabile** `VITE_SITE_URL` (per esempio `https://spesa.esempio.it`) su Vercel e in locale nel `.env.local`. A build il plugin SEO di `vite.config.ts`:

- assolutizza `og:image` e `twitter:image`;
- inietta `<link rel="canonical">` e `og:url` (radice del sito);
- genera `dist/sitemap.xml` con le viste indicizzabili (`/` e `/privacy`);
- genera `dist/robots.txt` con la riga `Sitemap`.

Senza `VITE_SITE_URL` la build resta valida: canonical, og:url e sitemap non vengono generati e `robots.txt` resta permissivo senza riga `Sitemap` (una sitemap con `loc` relativi non sarebbe valida). Un `VITE_SITE_URL` malformato rompe la build con un errore esplicito, per non pubblicare tag rotti. L'SVG sorgente dell'immagine Open Graph è `public/og.svg`; il PNG 1200×630 si rigenera con:

```bash
rsvg-convert -w 1200 -h 630 public/og.svg > public/og-image.png
```

### E2e con backend reale

`npm run test:e2e` copre l'interfaccia con dati mock, senza rete: è la suite
che gira in CI. La suite con backend reale vive in `e2e-backend/`, parla con lo
stack Supabase locale e si lancia con:

```bash
npm run test:e2e:backend
```

Il comando (`playwright.backend.config.ts` + `scripts/e2e-backend.sh`):

1. avvia lo stack locale se non è attivo (`scripts/db-start.sh`);
2. verifica che la famiglia demo esista e crea/aggiorna gli utenti Auth con
   `scripts/seed-auth.mjs`. Se la famiglia manca **non** esegue reset: si ferma
   e chiede `npm run db:reset`, così nessun dato locale viene cancellato;
3. rigenera `.env.local` (`npm run env:local`);
4. compila l'app in modalità Supabase, senza `VITE_DATA_MODE=mock`, in
   `dist-e2e-backend/` e la serve su `http://127.0.0.1:4174`.

La suite usa l'utente `demo@spesa.test` del seed e verifica il footer senza
"modalità demo · dati locali", così un build finito per errore in mock fallisce
subito. Copre login/logout reali, sessione persistente, creazione di un
articolo con quantità e categoria, persistenza al reload, passaggio allo
storico, undo, eliminazione, urgenza e aggiornamenti realtime tra due contesti
browser. I test girano in serie (`workers: 1`) perché la famiglia demo è
condivisa.

Gli articoli creati dai test hanno il prefisso `E2E-backend`; un teardown
globale li cancella dal database locale al termine, compresi quelli rimasti da
una run interrotta. Nessun dato reale e nessuna chiamata al cloud.

La CI esegue solo la suite mock (job `e2e`). Il job per quella con backend va
aggiunto a mano in `.github/workflows/ci.yml` (file riservato all'umano):
`supabase start` e `supabase db reset` preparano stack e dati demo, poi
`npm run test:e2e:backend` avvia da sé build e preview. Lo stack già attivo non
viene riavviato perché `scripts/db-start.sh` è idempotente.

Blocco pronto da incollare sotto `jobs:` nello stesso file:

```yaml
  e2e-backend:
    name: Playwright (backend locale)
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: supabase start
      - run: supabase db reset
      - run: npm run test:e2e:backend
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-backend-traces
          path: test-results/
          retention-days: 7
      - if: always()
        run: supabase stop --no-backup
```

In CI il reporter è `github`, quindi non viene generato `playwright-report/`:
l'artefatto utile è `test-results/` (tracce dei retry).

### Accessibilità e tastiera

`e2e/a11y.spec.ts` esegue axe (`@axe-core/playwright`, tag WCAG 2.1 A/AA) sulle
pagine pubbliche, sulla landing in tema scuro e a 360 px, e sull'app (lista,
storico, dialog impostazioni, dialog articolo, tema scuro e mobile). Una
violazione fa fallire il test e stampa nodi e riepilogo.

`e2e/keyboard.spec.ts` copre il comportamento non verificabile da axe:

- tab della lista con pattern ARIA completo: roving `tabindex`, frecce
  sinistra/destra, `Home`/`End`, `aria-controls` verso `#list-tabpanel` e
  `role="tabpanel"` con `aria-labelledby` aggiornato;
- alla chiusura dei dialog (Escape o sfondo) il focus torna al trigger; se il
  trigger non è più utilizzabile (pulsante "Aggiungi" disabilitato dopo l'invio)
  torna al campo rapido, pronto per il prossimo articolo.

Entrambe girano con `npm run test:e2e`, quindi sono in CI senza job aggiuntivi.

Quando si aggiunge un controllo nuovo, ricordare che il nome accessibile deve
contenere il testo visibile: per aggiungere contesto usare testo `sr-only`
dentro l'elemento, non un `aria-label` che sostituisce l'etichetta visibile. I
contenitori con testo `sr-only` figlio vanno posizionati (`position: relative`)
per non allargare la pagina su mobile.

### Stati di errore

Le azioni sulla lista (`add`, `update`, `setStatus`, `remove`, `restore`) non
lanciano eccezioni verso i componenti: restituiscono
`ActionResult = { ok: true } | { ok: false, message }` (`src/lib/types.ts`).
Il messaggio è già tradotto da `toDataError()` in `supabase-repository.ts`
(niente codici SQL o dettagli tecnici in UI) e viene anche salvato in
`list.error` per la zona di feedback globale.

Comportamento atteso, coperto dai test:

- **Dialog articolo**: se il salvataggio o l'eliminazione falliscono, il dialog
  resta aperto, mostra l'errore al suo interno (`role="alert"`) e conserva
  quanto digitato; i pulsanti sono disabilitati durante l'operazione, così un
  doppio clic non crea due articoli. Basta riprovare.
- **Aggiunta rapida**: se l'aggiunta fallisce il nome resta nel campo, pronto
  per un nuovo invio.
- **Caricamento**: l'errore compare in una zona `role="alert"` con il pulsante
  **Riprova** (solo con dati reali); con la cache disponibile si mostra l'ultima
  lista letta con l'avviso offline.
- La zona di errore globale è nascosta mentre un dialog è aperto, per non
  duplicare l'annuncio del medesimo errore.

Test:

- `e2e/error-states.spec.ts` (mock): rompe le scritture del repository mock
  sostituendo `Storage.prototype.setItem` per la chiave `spesa.mock.items.v2`
  con un flag su `window`, e verifica dialog aperto, testo conservato e retry
  riuscito. Serve, oltre al caso reale, perché la modalità mock è quella che
  gira in CI.
- `e2e-backend/items.spec.ts`: con `page.route` che aborta le richieste REST,
  verifica il messaggio "Connessione assente: controlla la rete e riprova.",
  il pulsante **Riprova** e il recupero quando la rete torna.
- `src/hooks/useShoppingList.test.tsx`: esiti `ok`/`errore` delle azioni, con e
  senza notifica push.

Il repository mock ora propaga l'errore di `localStorage.setItem` (storage
pieno o bloccato) invece di ignorarlo: in modalità demo una modifica non
salvata sul dispositivo viene segnalata, non simulata come riuscita.

A fine lavoro lo stack resta acceso come per `npm run dev`: spegnerlo con
`npm run db:stop`.

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

### Dipendenze e aggiornamenti

`npm audit` è pulito (0 vulnerabilità). Per vedere cosa è indietro:

```bash
npm audit
npm outdated
```

Regola: **patch e minor dentro la major corrente** si aggiornano in una PR
dedicata `chore/deps-*`, con `npm run verify`, `npm run test:e2e` e, se toccano
Playwright, `npx playwright install chromium`. **Le major restano fuori** da
questi aggiornamenti: richiedono una decisione a sé, una PR separata e una
verifica manuale dell'app.

Stato al 13 novembre 2026 (aggiornati: Biome 2.6.7, Playwright 1.65,
`@supabase/supabase-js` 2.119, CLI Supabase 2.122, Vite 7.3.8). Major ancora
indietro, con il motivo per cui non sono state forzate:

| Pacchetto | Attuale | Latest | Perché si aspetta |
| --- | --- | --- | --- |
| `preact` | 10.x | 11.x | tocca tutta la UI e `@preact/preset-vite`; va provato a mano |
| `vite` | 7.x | 8.x | configurazione, plugin SEO/PWA e build da riverificare |
| `vitest` | 4.x | 5.x | ambiente di test, ma va allineato a Vite |
| `typescript` | 5.9 | 7.x | cambio di compilatore: da valutare con calma |
| `supabase` (CLI) | 2.x | 3.x | gli script usano i comandi della 2.x |
| `jsdom` | 29.x | 31.x | solo ambiente unit, aggiornabile in un task a parte |

Le major si affrontano una alla volta, mai insieme a un task funzionale.

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
