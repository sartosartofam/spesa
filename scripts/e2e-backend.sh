#!/usr/bin/env bash
# Avvia lo stack Supabase locale, prepara i dati demo, compila l'app in
# modalità Supabase e serve la build per gli e2e con backend reale.
# Usato da playwright.backend.config.ts; solo stack locale.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash scripts/db-start.sh
node scripts/e2e-backend-prepare.mjs

# .env.local contiene URL e anon key locali, pubblici e rigenerabili.
bash scripts/dev-env.sh
grep -q '^VITE_SUPABASE_URL=' .env.local
grep -q '^VITE_SUPABASE_PUBLISHABLE_KEY=' .env.local

# Nessun VITE_DATA_MODE=mock: l'app deve parlare col database.
rm -rf dist-e2e-backend
npx vite build --outDir dist-e2e-backend --emptyOutDir

exec npx vite preview --outDir dist-e2e-backend --host 127.0.0.1 --port 4174
