#!/usr/bin/env bash
# Avvia lo stack Supabase locale e impedisce che i container ripartano al boot.
# Usato da `npm run dev` e `npm run db:start`.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

project=spesa
supabase=(npx --no-install supabase)

printf '\033[1;36m[db]\033[0m stack Supabase locale…\n'
# Idempotente: se lo stack è già attivo risponde in meno di un secondo.
"${supabase[@]}" start >/dev/null

# La CLI crea i container con restart=unless-stopped: riportiamo la policy a
# "no" così un riavvio del PC non li riaccende da solo. Li avvia questo script.
mapfile -t ids < <(docker ps -q --filter "label=com.supabase.cli.project=$project" 2>/dev/null)
if (( ${#ids[@]} > 0 )); then
  docker update --restart=no "${ids[@]}" >/dev/null
fi
