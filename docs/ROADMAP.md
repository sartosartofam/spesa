# Roadmap

Stato al 13 novembre 2026: **Fase 1 implementata su `dev` e verificata in locale**.
Restano le azioni umane della Fase 3 (Supabase cloud, Vercel, RLS review,
backup/keepalive effettivi, promozione su `main`). Dettaglio dello stato reale
in `docs/TODO.md` e nell'addendum A8 di `docs/studio-di-progetto.md`.

## Fase 0 — Agent-ready

- [x] Scaffold Preact + Vite mergiato su `dev`
- [x] Node 24 LTS pinnato in `.mise.toml`
- [x] Lint/format con Biome, unit test con Vitest, e2e con Playwright
- [x] `supabase/config.toml`, seed, test pgTAP di base
- [x] CI: qualità, database, e2e
- [x] Script `dev-env`, `doctor`, `bootstrap`
- [x] ADR e regole agenti aggiornate
- [x] GitHub: default branch `dev`, auto-merge e secrets keepalive
- [ ] GitHub: branch protection su `main`/`dev` con CI obbligatoria (umano)
- [ ] Primo progetto Supabase cloud + Vercel (umano)

## Fase 1 — Backend MVP

Ogni voce è stata una issue separata, con branch `feat/backend-*` o `feat/frontend-*`.

1. [x] **`feat/db-schema`** — enum `item_status`, tabelle `families`, `members`, `items`, `push_subscriptions`; chiavi, indici, trigger `updated_at`/`bought_at`.
2. [x] **`feat/db-rls`** — RLS su tutte le tabelle; policy per famiglia; push solo del membro, con test pgTAP di isolamento.
3. [x] **`feat/db-seed-types`** — famiglia fittizia, utenti test, articoli; script tipi.
4. [x] **`feat/auth`** — login/logout, sessione, route protette, gestione errori; recupero password e registrazione pubblica.
5. [x] **`feat/data-supabase`** — implementazione `ItemsRepository` con Supabase; switch in `src/lib/data/index.ts`.
6. [x] **`feat/realtime`** — subscription Postgres changes, refresh con debounce, fallback focus/visibility e `replica identity full` per i DELETE.
7. [x] **`feat/finished-push`** — flag `urgent`, Edge Function `send-push`, UI subscribe/revoca e rate limit. **Consegna reale spenta** finché non si configurano le chiavi VAPID (decisione 3 novembre 2026).
8. [x] **`feat/pwa-offline`** — service worker, icone 192/512, app shell offline, banner offline, ultima lista in lettura.
9. [x] **`test/e2e`** — suite mock stabile in CI; aggiunta una suite contro Supabase locale (`npm run test:e2e:backend`), non ancora in CI.
10. [x] **`chore/backup`** — Edge Function `export` con token dedicato, script di restore locale e restore di prova riuscito. Restano umani deploy, secret, cron e upload.

## Fase 2 — Rifiniture

- [x] Categorie condivise in `src/lib/categories.ts` (usate da UI e repository).
- [x] Anti-duplicati anche lato database (indice unique per famiglia/stato/nome/categoria).
- [x] SEO/Open Graph/sitemap, attivabili con `VITE_SITE_URL` quando ci sarà il dominio.
- [x] Accessibilità: suite axe (WCAG 2.1 A/AA) e test tastiera/focus su dialog e tab della lista.
- [x] Stati di errore: le azioni restituiscono un esito, i dialog restano aperti con il testo conservato, avviso con **Riprova** sul caricamento fallito.
- [x] Dipendenze: `npm audit` pulito e patch/minor aggiornate (Biome, Playwright, supabase-js, CLI, Vite); le major restano fuori con motivazione in `docs/SETUP.md`.
- [x] Copertura test: colmati i buchi su `item-merge` (identità, merge, ordinamento), `supabase.ts` (configurazione e rifiuto delle chiavi segrete), `pwa.ts` (registrazione del service worker) e `useOnlineStatus`; regole e convenzioni in `docs/SETUP.md` → "Test unitari e copertura".
- [ ] Badge in-app per notifiche perse (iOS); utile solo se un giorno si attiva il Web Push.
- [ ] Sentry free tier (opzionale; richiede DSN come secret).
- [ ] Valutare un rate limit anti-abuso sulle aggiunte (oggi Auth + RLS; il push è già limitato).

## Fase 3 — Produzione

- [ ] Supabase cloud + Vercel; RLS review umana.
- [ ] Eseguire il checklist [docs/SECURITY.md](SECURITY.md) prima del go-live.
- [ ] Keepalive: cron sul Raspberry Pi e verifica periodica dei ping (i secret GitHub Actions sono già presenti).
- [ ] Backup settimanale effettivo e test di ripristino.
- [ ] Job CI per la suite e2e con backend reale in `.github/workflows/ci.yml`.
- [ ] Promozione `dev` → `main` solo umana.

## Backlog operativo

Le issue su GitHub usano le label:
- `agent:backend`, `agent:frontend`, `agent:qa`
- `agent:ready` — prendibile da un agente
- `blocked:human` — serve un'azione umana
- `security` — richiede review umana prima di `main`

Un agente prende solo issue `agent:ready`, un task alla volta.
