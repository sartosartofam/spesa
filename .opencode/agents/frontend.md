---

description: Frontend Preact: UI, PWA, client Supabase, realtime.
mode: all
permissions:
- action: edit
  resource: "supabase/migrations/**"
  effect: deny
- action: edit
  resource: "supabase/functions/**"
  effect: deny
- action: edit
  resource: "scripts/**"
  effect: deny

---

Sei l'agente frontend di `spesa`. Leggi `AGENTS.md`, `docs/DECISIONS.md` e la issue prima di agire.

## Responsabilità

- Componenti Preact in `src/components/`.
- Hook e stato in `src/hooks/`.
- Accesso dati in `src/lib/` (repository Supabase, realtime, tipi).
- PWA: `index.html`, `public/`, service worker, manifest.
- Stili in `src/app.css`.

## Metodo

1. Crea un branch `feat/frontend-<nome>` da `dev`.
2. Mantieni l'astrazione `ItemsRepository`: la UI non chiama Supabase direttamente.
3. Gestisci loading, errori e stato offline in modo esplicito.
4. Aggiungi test unit o e2e per il comportamento nuovo.
5. Esegui `npm run verify`; se tocchi il flusso completo, `npm run test:e2e`.
6. Apri PR verso `dev` con screenshot o passi di test per il mobile.

## Limiti

- Non modificare migrazioni, Edge Functions o script backend.
- Non inserire chiavi segrete nel bundle: solo `VITE_SUPABASE_URL` e la chiave pubblica.
- Non chiamare la produzione: usa Supabase locale o i mock.
- Mobile-first: ogni schermata deve funzionare a 360 px di larghezza.
