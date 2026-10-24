# TODO — ripresa lavori

Stato al 25 ottobre 2026. Riferimenti: `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

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

## Prossimi task

Nessun lavoro aperto sulle impostazioni. Riprendere da `docs/ROADMAP.md`, in ordine:

### 1. Realtime — `feat/realtime`

- [ ] Subscription Postgres changes su `items`.
- [ ] Aggiornamento ottimistico e riconciliazione.
- [ ] Due browser vedono aggiunta/modifica entro 1 s.
- [ ] Test e verifica con Supabase locale.

### 2. Urgenze e Web Push — `feat/finished-push`

- [ ] Edge Function per invio notifiche su aggiunta/urgenza.
- [ ] Web Push e UI subscribe/revoca.
- [ ] Gestione errori e subscription scadute.

### 3. PWA offline — `feat/pwa-offline`

- [ ] Service worker, icone 192/512, app shell offline, banner offline.
- [ ] App installabile; nessuna scrittura in coda.

### 4. E2E completi — `test/e2e`

- [ ] Flussi aggiunta, spunta, storico, “è finito”, login.
- [ ] Suite stabile in CI.

### 5. Backup ed export — `chore/backup`

- [ ] Edge Function `export` con token dedicato.
- [ ] Export JSON su Cloudflare R2 / Backblaze B2.
- [ ] Documento di restore e ripristino di prova.

### 6. Produzione — umano

- [ ] Verifica e hardening produzione (issue #22).
- [ ] Supabase cloud + Vercel, RLS review umana.
- [ ] Keepalive e backup effettivi.
- [ ] Promozione `dev` → `main` solo umana.

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
- Al ritorno: `git switch dev && git pull --ff-only origin dev` e controllare le PR aperte.
