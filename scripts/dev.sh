#!/usr/bin/env bash
# Avvia lo stack Supabase locale, tiene .env.local allineato e lancia Vite.
# Uso: npm run dev [-- --host 0.0.0.0]
#
# I container non partono al boot: li avvia questo script (tramite
# scripts/db-start.sh) e la loro restart policy viene riportata a "no".
# Per fermarli: npm run db:stop.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

project=spesa

say() { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }

if [[ ! -x node_modules/.bin/vite ]]; then
  echo "node_modules mancante: esegui prima 'npm ci'." >&2
  exit 1
fi

before=$(docker ps -q --filter "label=com.supabase.cli.project=$project" 2>/dev/null | wc -l)

bash scripts/db-start.sh

# Rigenera le chiavi locali solo quando servono (stack appena avviato o file assente).
if [[ ! -f .env.local || $before -eq 0 ]]; then
  say "genero .env.local dalle chiavi locali…"
  bash scripts/dev-env.sh
fi

say "Vite…"
exec ./node_modules/.bin/vite "$@"
