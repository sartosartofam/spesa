#!/usr/bin/env bash
# Bootstrap idempotente per una macchina di sviluppo (Omarchy/Arch).
# Non usa sudo e non installa pacchetti di sistema: controlla e stampa i comandi.
# Uso: bash scripts/bootstrap.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== Spesa: bootstrap ambiente di sviluppo =="

run() {
  if command -v mise >/dev/null 2>&1; then
    mise exec -- "$@"
  else
    "$@"
  fi
}

if command -v mise >/dev/null 2>&1; then
  echo "-> mise install (Node 24 LTS da .mise.toml)"
  mise install
else
  echo "!! mise non trovato. Installa mise e riapri la shell: https://mise.jdx.dev"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "!! docker non trovato. Su Arch: sudo pacman -S docker docker-compose"
elif ! docker info >/dev/null 2>&1; then
  echo "!! docker non accessibile. Esegui:"
  echo "   sudo usermod -aG docker \"$USER\""
  echo "   poi esci e rientra nella sessione."
fi

echo "-> npm ci"
run npm ci

echo "-> hook git"
git config core.hooksPath .githooks

if docker info >/dev/null 2>&1; then
  echo "-> Supabase locale"
  run npx supabase start
  run npm run env:local
else
  echo "!! Salto Supabase locale: docker non accessibile."
fi

if command -v gh >/dev/null 2>&1 && ! gh auth status >/dev/null 2>&1; then
  echo "-> GitHub CLI non autenticato. Esegui: gh auth login"
fi

if command -v vercel >/dev/null 2>&1; then
  echo "-> Vercel CLI presente. Login solo se devi deployare da questa macchina: vercel login"
else
  echo "-> Vercel CLI assente (opzionale): npm i -g vercel"
fi

echo "-> npm run verify"
run npm run verify

echo
echo "Bootstrap completato. Controllo finale: bash scripts/doctor.sh --verify"
