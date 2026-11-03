# TODO — ripresa lavori

Stato al 3 novembre 2026. Riferimenti: `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

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

## In questo branch

- [x] `feat/push` — Web Push completo ma **feature-gated**:
  - `src/lib/push.ts`: opt-in/revoca, base64url, mappa errori utente, allowlist endpoint.
  - `src/hooks/usePushNotifications.ts` + sezione **Impostazioni → Notifiche** (nascosta senza `VITE_VAPID_PUBLIC_KEY`).
  - Trigger push su aggiunta riuscita e su passaggio `urgent` da `false` a `true`, best-effort e mai bloccante.
  - Edge Function `supabase/functions/send-push`: verifica JWT e appartenenza alla famiglia, esclude l’autore, allowlist endpoint, validazione chiavi, pulizia subscription `404`/`410`, `service_role` solo lato server.
  - Service worker: handler `push` e `notificationclick` (apre `/app`, focus della finestra già aperta).
  - Disiscrizione su logout e cancellazione account.
  - Test: unit (172) e e2e (43) verdi; pgTAP 250 verdi; function provata in locale con risposta `push_not_configured`.
  - **Resta umano**: generare le chiavi VAPID, impostare `VITE_VAPID_PUBLIC_KEY` su Vercel e i secret `VAPID_*` su Supabase, fare il deploy della function e provare la consegna reale. Vedi `docs/SETUP.md` e `docs/SECURITY.md`.

## Prossimi task

### 1. Backup ed export — `chore/backup`

- [ ] Edge Function `export` con token dedicato (ADR-0003).
- [ ] Export JSON su Cloudflare R2 / Backblaze B2.
- [ ] Documento di restore e ripristino di prova.

### 2. Produzione — umano

- [ ] Verifica e hardening produzione (issue #22): Supabase Cloud, Vercel, GitHub.
- [ ] RLS review umana con due famiglie reali/fittizie.
- [ ] Configurazione Web Push in produzione (chiavi VAPID, secret, deploy function).
- [ ] Keepalive e backup effettivi.
- [ ] Promozione `dev` → `main` solo umana.

### 3. Rifiniture e backlog

- [ ] Rate limit per l’invio push nella Edge Function (ora assente).
- [ ] E2e con backend reale (oggi mock): CRUD Supabase, realtime e push in una suite dedicata.
- [ ] Vincolo/trigger anti-duplicati lato database (il merge duplicati è solo client).
- [ ] SEO/OG/sitemap per la landing.
- [ ] Aggiornare i documenti storici invecchiati (`docs/studio-di-progetto.md`).
- [ ] IBAN e intestatario donazioni reali (ora segnaposto).
- [ ] Badge in-app per notifiche perse (iOS) e Sentry free tier (opzionali).

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
- Nessuna chiave VAPID o `service_role` nel repository: il push reale va configurato solo in produzione.
- Al ritorno: `git switch dev && git pull --ff-only origin dev` e controllare le PR aperte.
