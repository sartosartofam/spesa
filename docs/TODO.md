# TODO — ripresa lavori

Stato al 13 novembre 2026. Riferimenti: `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

## Fatto e mergiato su `dev`

- [x] Impostazioni: autosalvataggio alla chiusura, Annulla, reset con conferma, X sticky.
- [x] Logout con conferma.
- [x] Icona “preso” semplificata.
- [x] Landing: hero full screen, glow che segue il mouse, hover delle card.
- [x] Backend `rename_family` owner-only + test pgTAP.
- [x] Crediti Streamline spostati dalla lista a Impostazioni → Crediti; landing invariata.
- [x] Nome famiglia reale nel footer, editor owner-only in Impostazioni, member in sola lettura.
- [x] Backend `leave_family(p_family_id)` con successione automatica dell’owner al membro più vecchio, nuova famiglia personale per chi esce, test pgTAP.
- [x] PR **#46** (`feat/family-leave-ui`): uscita famiglia lato UI con conferma, risultato bloccante e ricarica.
  - Verifica live: owner esce → partner diventa owner; member esce → nessuna successione; demo/partner ripristinati con `npm run db:reset`.
- [x] PR **#49** (`feat/backend-user-settings`): tabella `user_settings`, RLS self-only, grant solo `authenticated`, trigger `updated_at`, test pgTAP, tipi rigenerati.
- [x] PR **#51** (`feat/frontend-account-settings`): sync delle impostazioni per account, cache per `userId`, seed dalla cache locale, categorie personalizzate nel payload, avviso non bloccante e fallback locale.
  - Test: 117 unit, 20 e2e, 203 pgTAP; verifica live con `demo@spesa.test` e `partner@spesa.test` nella stessa famiglia.
- [x] PR **#85** (`feat/realtime`): subscription Postgres changes su `items` con filtro `family_id`, refresh silenzioso con debounce, fallback su focus/visibility e riconnessione; migrazione publication e test pgTAP.
- [x] PR **#86** (`feat/password-reset`): recupero password con `resetPasswordForEmail` + `updateUser`, route pubbliche `/forgot-password` e `/reset-password` con `noindex`, link dal login, redirect locali, test unit ed e2e.
- [x] PR **#87** (`feat/pwa`): PWA base con manifest, icone 192/512/maskable/apple-touch, service worker in produzione (network-first navigazioni, cache-first asset), cache dell’ultima lista per famiglia, banner offline, test unit ed e2e.
- [x] PR **#88** (`feat/push`) — Web Push completo ma **feature-gated**:
  - `src/lib/push.ts`: opt-in/revoca, base64url, mappa errori utente, allowlist endpoint.
  - `src/hooks/usePushNotifications.ts` + sezione **Impostazioni → Notifiche** (nascosta senza `VITE_VAPID_PUBLIC_KEY`).
  - Trigger push su aggiunta riuscita e su passaggio `urgent` da `false` a `true`, best-effort e mai bloccante.
  - Edge Function `supabase/functions/send-push`: verifica JWT e appartenenza alla famiglia, esclude l’autore, allowlist endpoint, validazione chiavi, pulizia subscription `404`/`410`, `service_role` solo lato server.
  - Service worker: handler `push` e `notificationclick` (apre `/app`, focus della finestra già aperta).
  - Disiscrizione su logout e cancellazione account.
  - Test: unit (172) e e2e (43) verdi; pgTAP 250 verdi; function provata in locale con risposta `push_not_configured`.
  - **Consegna reale rinviata dopo il deploy**: per ora non generiamo le chiavi VAPID né attiviamo Web Push in produzione, e anche in futuro resta un opt-in silenzioso, non una fonte di notifiche inondatorie. Decisione presa il 3 novembre 2026: il codice resta feature-gated (niente `VITE_VAPID_PUBLIC_KEY` = sezione Notifiche nascosta, nessuna chiamata alla function). La consegna reale, se un giorno servirà, resta documentata in `docs/SETUP.md` e `docs/SECURITY.md`.

- [x] PR **#89** (`feat/backend-push-rate-limit`) — rate limit dell'invio push:
  - tabella `public.rate_limits` (contatori per chiave) con RLS attiva e nessuna policy: i ruoli API non la vedono;
  - RPC `public.consume_rate_limit(p_key, p_max, p_window_seconds)` `security definer`, `search_path = ''`, grant `execute` solo a `service_role`;
  - budget `send-push`: 12 unità per 60 secondi per utente (`send-push:<user.id>`); oltre il budget la function risponde `429 rate_limited` prima di interrogare articoli e subscription;
  - test pgTAP: struttura, permessi anon/authenticated, budget, chiavi indipendenti, scadenza simulata, parametri invalidi, vincolo di lunghezza;
  - verificato in locale: 12 chiamate passano, la 13ª riceve `429`;
  - tipi rigenerati (`npm run db:types`); unit, e2e, pgTAP e `npm run verify` verdi.

## Prossimi task

### 1. Backup ed export — `chore/backup`

- [x] Edge Function `export` con token dedicato (ADR-0003): snapshot JSON delle 7 tabelle applicative, `401` senza token valido, `503 export_not_configured` senza secret, confronto su SHA-256.
- [x] Grant `select, insert, update` su `keepalive` a `service_role` (mancavano per export e restore), con test pgTAP nella suite keepalive.
- [x] Script di restore di prova `scripts/backup/restore-local.mjs` (solo locale, guard sull'host).
- [x] Restore di prova **riuscito**: export → `db:reset` → upsert con conteggi e relazioni verificati su tutte le 7 tabelle, inclusi invito, subscription push e impostazioni utente.
- [ ] Export JSON effettivo su Cloudflare R2 / Backblaze B2: cron Pi + secret `EXPORT_TOKEN` + deploy function = azione umana (vedi `docs/SETUP.md` → "Backup e restore").

### 2. Produzione — umano

- [ ] Verifica e hardening produzione (issue #22): Supabase Cloud, Vercel, GitHub.
- [ ] RLS review umana con due famiglie reali/fittizie.
- [x] Configurazione Web Push in produzione: **rinviata dopo il deploy** (decisione 3 novembre 2026). Le chiavi VAPID non servono per l'uso attuale della lista e, anche in futuro, puntiamo a un opt-in discreto: niente notifiche inondatorie dalla webapp. Quando si deciderà di attivarle, seguire `docs/SETUP.md` (Web Push) per chiavi, secret e deploy function.
- [ ] Keepalive e backup effettivi.
- [ ] Promozione `dev` → `main` solo umana.

### 3. Rifiniture e backlog

- [x] SEO/OG/sitemap per la landing: immagine OG 1200×630 con palette dell'app, tag statici Open Graph/Twitter Card + JSON-LD in `index.html`, plugin Vite con `VITE_SITE_URL` per canonical/og:url assoluti e generazione `sitemap.xml`/`robots.txt` a build, `useDocumentMeta` aggiornato con `urlPath` per le viste indicizzabili. **Resta umano**: scegliere il dominio e impostare `VITE_SITE_URL` su Vercel (vedi `docs/SETUP.md` → "SEO, Open Graph e sitemap").
- [x] E2e con backend reale (suite dedicata contro Supabase locale, senza mock): login reale e utenti del seed, CRUD con persistenza al reload, storico e undo, urgenza, realtime tra due contesti browser. Comando `npm run test:e2e:backend`. Nel corso del lavoro è emerso un bug realtime reale: i DELETE filtrabili richiedono `alter table public.items replica identity full` (migrazione `20261112091000_items_replica_identity.sql` + asserzione pgTAP). **Resta umano**: aggiungere il job CI per questa suite in `.github/workflows/ci.yml` (vedi `docs/SETUP.md` → "E2e con backend reale").
- [x] Vincolo anti-duplicati lato database: indice unique `items_family_status_identity_key` su (family_id, status, lower(btrim(name)), lower(btrim(category))) con test pgTAP (identità, maiuscole/spazi, storico separato, famiglie e categorie distinte, update che collidono). Il merge amichevole resta lato client; in gara tra membri il secondo riceve `23505`, già tradotto in "Esiste già un articolo con questi dati.".
- [x] Aggiornare i documenti storici invecchiati: `docs/studio-di-progetto.md` ha un nuovo addendum **A8** con lo stato reale (stati `to_buy|bought + urgent`, auth/inviti, realtime con `replica identity full`, push gated e rate limit, PWA, export, SEO, suite di test) e richiami alle sezioni superate; `docs/ROADMAP.md` è allineata (Fase 1 completata, resta la Fase 3 umana).
- [x] Audit accessibilità (`feat/frontend-a11y`): suite `e2e/a11y.spec.ts` con axe (`@axe-core/playwright`, WCAG 2.1 A/AA) su pagine pubbliche, landing dark/mobile, app, storico e dialog, più `e2e/keyboard.spec.ts` per tastiera e focus. Corretti i nomi accessibili di chip categoria e riga articolo (`label-content-name-mismatch`), etichettato l'input file dei preset, ripristinato il focus al trigger alla chiusura dei dialog e completato il pattern ARIA dei tab (roving tabindex, frecce, Home/End, `aria-controls`/`role="tabpanel"`).
- [ ] IBAN e intestatario donazioni reali (ora segnaposto).
- [ ] Badge in-app per notifiche perse (iOS) e Sentry free tier (opzionali; il badge iOS vale solo se un giorno si attiva il Web Push).

## Comandi di verifica

```bash
npm run verify
npm run test:e2e
npx supabase test db
```

## Note e vincoli

- Solo Supabase locale; nessuna chiave cloud, nessun `supabase link` o `db push`.
- Le impostazioni sono per account, non per famiglia.
- `user_settings` è protetta da RLS self-only e da test di isolamento tra utenti.
- `dev` è il branch di integrazione; `main` solo promozione umana.
- Nessuna chiave VAPID o `service_role` nel repository. Le chiavi VAPID non vengono generate neanche ora: l'attivazione del Web Push reale è rinviata dopo il deploy (decisione 3 novembre 2026).
- Al ritorno: `git switch dev && git pull --ff-only origin dev` e controllare le PR aperte.
