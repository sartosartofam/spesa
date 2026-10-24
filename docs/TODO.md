# TODO — ripresa lavori

Stato al 24 ottobre 2026. Riferimenti: `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`.

## Fatto e mergiato su `dev`

- [x] Impostazioni: autosalvataggio alla chiusura, Annulla, reset con conferma, X sticky.
- [x] Logout con conferma.
- [x] Icona “preso” semplificata.
- [x] Landing: hero full screen, glow che segue il mouse, hover delle card.
- [x] Backend `rename_family` owner-only + test pgTAP.
- [x] Crediti Streamline spostati dalla lista a Impostazioni → Crediti; landing invariata.
- [x] Nome famiglia reale nel footer, editor owner-only in Impostazioni, member in sola lettura.
- [x] Backend `leave_family(p_family_id)` con successione automatica dell’owner al membro più vecchio, nuova famiglia personale per chi esce, test pgTAP.

## In sospeso

- [ ] PR **#46** (`feat/family-leave-ui`): uscita famiglia lato UI con conferma, risultato bloccante e ricarica.
  - Al momento della pausa: lint/typecheck/unit/build, Playwright e Vercel verdi; pgTAP in corso; auto-merge abilitato.
  - Da fare al ritorno: verificare merge, aggiornare `dev` locale.
  - Verifica live già fatta: owner esce → partner diventa owner; member esce → nessuna successione; demo/partner ripristinati con `npm run db:reset`.

## Prossimo task — impostazioni per account

Obiettivo: le impostazioni seguono l’account, non il dispositivo, e non sono condivise con la famiglia.

### Backend

- [ ] Migrazione `user_settings`:
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `settings jsonb not null default '{}'::jsonb`
  - `updated_at timestamptz not null default now()`
  - constraint: payload oggetto e dimensione massima ragionevole.
  - trigger `updated_at` riusando `public.set_updated_at()`.
  - RLS abilitata; policy select/insert/update/delete solo `user_id = auth.uid()`.
  - grant solo ad `authenticated`; niente `anon`.
- [ ] Test pgTAP `user_settings.test.sql`:
  - RLS e grant;
  - A vede/salva solo la propria riga;
  - B non vede e non modifica quella di A;
  - insert con `user_id` altrui rifiutato;
  - payload non valido rifiutato;
  - `updated_at` aggiornato.
- [ ] Aggiornare `src/lib/database.types.ts` con `npm run db:types`.
- [ ] Verificare `npx supabase test db`.

### Frontend

- [ ] Nuovo modulo `src/lib/account-settings.ts`:
  - `loadAccountSettings(userId)` legge `user_settings`;
  - `saveAccountSettings(userId, settings)` fa upsert;
  - payload versionato con `quickAdd`, `defaultCategory`, `activePresetId`, `presets`, `customCategories`;
  - parsing/normalizzazione tollerante e testabile.
- [ ] Refactor `src/lib/categories.ts`:
  - esportare lettura/scrittura delle categorie custom;
  - normalizzazione riutilizzabile;
  - `categoriesFromCustom`.
- [ ] Refactor `src/lib/settings.ts`:
  - estrarre parsing/normalizzazione da `readSettings` per riusarlo sul payload account;
  - `createDefaultSettings(categories?)`.
- [ ] `src/app.tsx`:
  - stato `categories`;
  - load account dopo il login, con fallback al cache locale;
  - seed dell’account dal locale se la riga remota non esiste;
  - save account alla chiusura Impostazioni e quando si crea una categoria;
  - messaggio non bloccante se la sincronizzazione fallisce;
  - passare `categories` a `ItemDialog` e `SettingsDialog`.
- [ ] `ItemDialog`: usare le categorie passate dall’app e callback per aggiungerle.
- [ ] `SettingsDialog`: usare le categorie passate dall’app.
- [ ] Test unitari per parsing/normalizzazione payload, categorie custom e mapping errori sync.
- [ ] Verifica live:
  - login demo, modifica impostazioni su un contesto;
  - secondo contesto/browser vede le stesse impostazioni;
  - member della stessa famiglia non vede le impostazioni dell’owner;
  - logout/login mantiene le impostazioni;
  - senza rete restano quelle locali e compare l’errore.

## Comandi di verifica

```bash
npm run verify
npm run test:e2e
npx supabase test db
```

## Note e vincoli

- Solo Supabase locale; nessuna chiave cloud, nessun `supabase link` o `db push`.
- Le impostazioni sono per account, non per famiglia.
- La tabella `user_settings` va protetta con RLS e test di isolamento tra utenti.
- `dev` è il branch di integrazione; `main` solo promozione umana.
- Al ritorno controllare prima lo stato di PR #46 e aggiornare `dev`.
