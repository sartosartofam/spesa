# Roadmap

**Unica fonte di stato del progetto.** Se un altro documento dice qualcosa di diverso sullo stato, vale questo. Storico delle modifiche: commit e PR su GitHub, non un changelog a parte.

Se sei l'umano e vuoi sapere cosa devi fare, la risposta è **Fase 3**, nell'ordine dato. Se sei un agente e l'umano te lo chiede, leggi la Fase 3 (e `docs/SECURITY.md` per il dettaglio) e rispondi con il primo punto non spuntato.

Stato al 17 novembre 2026: fase 1 implementata e verificata in locale su `dev`; Supabase cloud e Vercel configurati; restano le azioni umane della fase 3 e la prima promozione su `main`.

## Fase 1 — MVP lista della spesa (completata)

| Area | Cosa c'è |
| --- | --- |
| Database | enum `item_status` (`to_buy`/`bought`), tabelle `families`, `members`, `items`, `push_subscriptions`, `family_invites`, `user_settings`, `rate_limits`, `keepalive`; indici, trigger `updated_at`/`bought_at`, `replica identity full` su `items` per i DELETE realtime |
| RLS | RLS su tutte le tabelle, policy per famiglia, push e impostazioni self-only; inviti accessibili solo via RPC; `rate_limits` invisibile ai ruoli API; pannello admin in sola lettura (`admins`, `is_admin()`, `admin_overview()`). 317 asserzioni pgTAP |
| Auth | email + password, registrazione pubblica con conferma, recupero password, famiglia personale al primo accesso (`ensure_current_family`), inviti monouso con codice hashato, uscita e cambio famiglia con successione dell'owner |
| Dati | repository mock e Supabase dietro la stessa interfaccia, realtime su `items`, merge amichevole dei duplicati lato client + vincolo unique lato database |
| Urgenza e push | flag `urgent` con priorità in lista; Edge Function `send-push` completa ma **spenta** (manca `VITE_VAPID_PUBLIC_KEY`), con rate limit 12 richieste/minuto per utente |
| PWA | manifest, icone, service worker (network-first sulle navigazioni, cache-first sugli asset), ultima lista in lettura offline, banner offline, nessuna coda di scrittura |
| Backup | Edge Function `export` con token dedicato e script di restore locale; restore di prova riuscito su tutte le tabelle esportate |
| Test | 258 unit, 57 e2e mock (in CI), 6 e2e backend contro Supabase locale, 317 asserzioni pgTAP |

## Fase 2 — Rifiniture (completata, salvo backlog)

- [x] Categorie condivise tra UI e repository (`src/lib/categories.ts`).
- [x] Anti-duplicati anche lato database (indice unique per famiglia/stato/nome/categoria).
- [x] SEO: Open Graph, JSON-LD, `sitemap.xml`/`robots.txt` generati a build, attivabili con `VITE_SITE_URL`.
- [x] Accessibilità: axe (WCAG 2.1 A/AA) su pagine pubbliche e app, test tastiera e focus dei dialog.
- [x] Stati di errore: le azioni restituiscono un esito, i dialog restano aperti con il testo conservato, avviso con **Riprova** sul caricamento fallito.
- [x] Dipendenze: `npm audit` a 0, patch/minor aggiornate; le major restano fuori con motivazione in `docs/SETUP.md`.
- [x] Copertura test: `item-merge`, client Supabase, registrazione del service worker, stato rete.
- [x] Performance: chunk Supabase separato e budget gzip di JS/CSS che fa fallire la build se il bundle cresce.
- [x] Lazy-load dell'app per alleggerire la landing; manifest di precache per aprire l'app offline, con test e2e.

Aperto in fase 2:

- [ ] Badge in-app per notifiche perse (iOS): utile solo se il Web Push verrà attivato.
- [ ] Sentry free tier (opzionale, richiede un DSN come secret).
- [ ] Rate limit anti-abuso sulle aggiunte (oggi il limite è su Auth e sul push).

## Fase 3 — Go-live (azioni umane, in questo ordine)

Per i dettagli e i controlli di sicurezza: `docs/SECURITY.md`. Qui c'è solo la sequenza.

1. [x] **Riattivare il progetto Supabase.** Il progetto risponde di nuovo: DNS e API attivi.
2. [ ] **Applicare le migrazioni al cloud.** Oggi nessuna delle 19 migrazioni risulta applicata: ogni tabella risponde `PGRST205` (schema cache vuota), `keepalive` compresa. Senza schema non funzionano né l'app né i due ping. Il flusso di release si sceglie in `docs/SECURITY.md` → "Supabase Cloud"; il push lo esegue l'umano, non un agente.
3. [ ] **Aggiornare i secret del keepalive** con il ref attuale del progetto: i secret `SUPABASE_URL`/`SUPABASE_ANON_KEY` su GitHub puntano ancora al progetto vecchio.
4. [ ] **Attivare il keepalive.** Il cron sul Raspberry Pi è configurato e validato a meno della risposta HTTP (lun/mer/ven 03:00, log in `/mnt/hdd1T/projects/spesa/keepalive/`); mancano il workflow GitHub Actions e il primo ping verde, che dipende dal punto 2. Due ping indipendenti, così il progetto non si risospende.
5. [ ] **Attivare il backup**: deploy della function `export`, secret `EXPORT_TOKEN`, cron settimanale con upload su R2/B2 e monitoraggio dei fallimenti.
6. [ ] **RLS review umana** con due famiglie reali o fittizie e con `anon`.
7. [ ] **Branch protection / ruleset** su `dev` e `main` con i tre check obbligatori (qualità, pgTAP, e2e).
8. [ ] **Vercel**: variabili pubbliche reali, Node 24, dominio definitivo e `VITE_SITE_URL`, conferma email e SMTP provati con un indirizzo vero, preview verificato.
9. [ ] **Job CI per gli e2e backend** (blocco pronto in `docs/SETUP.md` → "E2e con backend reale").
10. [ ] **Politica password a 8 caratteri con composizione**: oggi il locale richiede 12 caratteri senza requisiti. Prima del go-live si passa a `minimum_password_length = 8` e `password_requirements = lower_upper_letters_digits_symbols`, allineando `supabase/config.toml`, i messaggi in `src/lib/auth.ts` e nelle pagine di registrazione/reset, le password demo di seed ed e2e e i test. Dettaglio in `docs/SECURITY.md` → "Supabase Cloud".
11. [ ] **Promozione `dev` → `main`**: sarà il primo deploy in assoluto, `main` è ancora fermo all'initial commit. Solo dopo i punti precedenti.

## Debito noto e scelte rinviate

- **Politica password rinviata alla Fase 3**: nel locale restano 12 caratteri senza composizione per non rompere seed, utenti demo e test; prima del go-live si scende a 8 con requisiti di composizione (punto 10 della Fase 3).
- **Web Push spento per scelta** (decisione 3 novembre 2026): il codice resta feature-gated e silenzioso; le chiavi VAPID non vengono generate finché non serve.
- **`main` mai deployato**: la prima promozione va trattata come un rilascio, non come un merge di routine.
- **Major delle dipendenze indietro** (Preact 11, Vite 8, Vitest 5, TypeScript 7, CLI Supabase 3, jsdom 31): una alla volta, con verifica manuale. Tabella in `docs/SETUP.md`.
- **`npm run test:e2e:backend` non gira in CI**: va lanciato a mano quando cambia il livello dati.
- **Keepalive rosso ogni notte** finché lo schema non è applicato al cloud (`404`, `PGRST205`): sintomo atteso, non un incidente.

## Backlog (idee, non impegni)

- **Pannello di controllo admin** (issue #109): la fetta 1 è completa — dati (`admins` popolata a mano, `is_admin()` e `admin_overview()` in sola lettura con test pgTAP) e pagina `/admin` (rotta `noindex`, chunk lazy, `NotFoundPage` per chi non è admin, solo aggregati, aggiornamento manuale). Restano da decidere i feature flag per spegnere una feature durante i test (fetta 2, che richiede tabella dedicata, hook client e audit log) e, solo se servirà, una UI per nominare admin, che oggi è una riga SQL. Tutto "vanilla": Postgres, RPC `security definer` e UI Preact esistenti, nessun servizio esterno.
- Fase 2 del prodotto: faccende domestiche.
- Magic link al posto (o in aggiunta) di email + password (ADR-0002).
- Multi-famiglia per utente (oggi un utente = una famiglia, con cambio via invito).
- Codice invito durante la registrazione: campo opzionale per collegare il nuovo account direttamente alla famiglia esistente come `member`, dopo la conferma email, senza creare prima una famiglia personale. Definire anche il comportamento per codici non validi o scaduti.
