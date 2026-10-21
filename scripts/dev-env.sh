#!/usr/bin/env bash
# Genera .env.local dalle chiavi dello stack Supabase locale.
# Le chiavi locali sono pubbliche e usa-e-getta: non sono secret di produzione.
# Uso: npm run env:local
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if command -v supabase >/dev/null 2>&1; then
  supabase_bin=(supabase)
else
  supabase_bin=(npx --no-install supabase)
fi

if ! status="$("${supabase_bin[@]}" status -o env 2>/dev/null)"; then
  echo "Stack Supabase locale non attivo. Esegui prima: npm run db:start" >&2
  exit 1
fi

api_url="$(printf '%s\n' "$status" | sed -n 's/^API_URL=//p' | tr -d '"')"
anon_key="$(printf '%s\n' "$status" | sed -n 's/^ANON_KEY=//p' | tr -d '"')"

if [[ -z "$api_url" || -z "$anon_key" ]]; then
  echo "Impossibile leggere API_URL/ANON_KEY da 'supabase status -o env'." >&2
  exit 1
fi

umask 077
cat > .env.local <<EOF
# Generato da scripts/dev-env.sh — non committare.
# Rigenerare con: npm run env:local
VITE_SUPABASE_URL=$api_url
VITE_SUPABASE_PUBLISHABLE_KEY=$anon_key
EOF

echo "Scritto .env.local con le chiavi dello stack locale ($api_url)."
