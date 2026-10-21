# Roadmap

Stato: **Fase 0 — repository pronto per gli agenti**. Il codice applicativo esiste come scaffold Preact + Vite con dati mock; il backend non è ancora implementato.

## Fase 0 — Agent-ready

- [x] Scaffold Preact + Vite mergiato su `dev`
- [x] Node 24 LTS pinnato in `.mise.toml`
- [x] Lint/format con Biome, unit test con Vitest, e2e con Playwright
- [x] `supabase/config.toml`, seed, test pgTAP di base
- [x] CI: qualità, database, e2e
- [x] Script `dev-env`, `doctor`, `bootstrap`
- [x] ADR e regole agenti aggiornate
- [ ] GitHub: default branch `dev`, protezione `main`/`dev`, auto-merge, secrets keepalive
- [ ] Primo progetto Supabase cloud + Vercel (umano)

## Fase 1 — Backend MVP

Ogni voce è una issue separata, con branch `feat/backend-*` o `feat/frontend-*`.

1. **`feat/db-schema`** — enum `item_status`, tabelle `families`, `members`, `items`, `push_subscriptions`; chiavi, indici, trigger `updated_at`/`bought_at`.
   - Done: `npm run db:reset` pulito; tipi generati; test pgTAP di struttura.
2. **`feat/db-rls`** — RLS su tutte le tabelle; policy per famiglia; push solo del membro.
   - Done: test pgTAP che verificano isolamento tra due famiglie.
3. **`feat/db-seed-types`** — famiglia fittizia, utenti test, articoli; script tipi.
   - Done: login locale con utente test; `npm run db:types` aggiornato.
4. **`feat/auth`** — login/logout, sessione, route protette, gestione errori.
   - Done: e2e login → lista; logout; sessione persistente.
5. **`feat/data-supabase`** — implementazione `ItemsRepository` con Supabase; switch in `src/lib/data/index.ts`.
   - Done: CRUD reale; mock resta per test/demo.
6. **`feat/realtime`** — subscription Postgres changes + optimistic update.
   - Done: due browser vedono l'aggiunta entro 1 s.
7. **`feat/finished-push`** — flag `urgent`, Edge Function, Web Push, UI subscribe.
   - Done: notifica su aggiunta/urgenza; revoca subscription.
8. **`feat/pwa-offline`** — service worker, icone 192/512, app shell offline, banner offline.
   - Done: app installabile; shell disponibile senza rete; nessuna scrittura in coda.
9. **`test/e2e`** — flussi completi: aggiunta, spunta, storico, "è finito", login.
   - Done: suite stabile in CI.
10. **`chore/backup`** — Edge Function export con token dedicato; doc di restore.
    - Done: export eseguito almeno una volta; restore di prova riuscito.

## Fase 2 — Rifiniture

- Categorie condivise in `src/lib/categories.ts` (togliere l'import da `mock-repository`).
- Badge in-app per notifiche perse (iOS).
- Sentry free tier (opzionale).
- Rate limiting lato Edge Function per le aggiunte.

## Fase 3 — Produzione

- Supabase cloud + Vercel; RLS review umana.
- Keepalive: secrets GitHub Actions + cron Raspberry Pi.
- Backup settimanale effettivo e test di ripristino.
- Promozione `dev` → `main` solo umana.

## Backlog operativo

Le issue su GitHub usano le label:
- `agent:backend`, `agent:frontend`, `agent:qa`
- `agent:ready` — prendibile da un agente
- `blocked:human` — serve un'azione umana
- `security` — richiede review umana prima di `main`

Un agente prende solo issue `agent:ready`, un task alla volta.
