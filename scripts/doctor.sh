#!/usr/bin/env bash
# Controlla che la macchina sia pronta per sviluppare su spesa.
# Uso: bash scripts/doctor.sh [--verify]
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

failures=0
warnings=0

ok() { printf '  ok    %s\n' "$1"; }
warn() { printf '  warn  %s\n' "$1"; warnings=$((warnings + 1)); }
fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }

check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$1 ($("$1" --version 2>&1 | head -1))"
  else
    fail "$1 non trovato. $2"
  fi
}

echo "== Node e npm =="
current_node=""
if command -v node >/dev/null 2>&1; then
  current_node="$(node --version)"
fi

if command -v mise >/dev/null 2>&1 && [[ -f .mise.toml ]]; then
  project_node="$(mise exec -- node --version 2>/dev/null || true)"
  if [[ -n "$project_node" ]]; then
    project_major="${project_node#v}"
    project_major="${project_major%%.*}"
    if ((project_major >= 24)); then
      ok "node $project_node (mise, progetto)"
    else
      fail "node $project_node (mise): serve Node 24 LTS."
    fi
    if [[ -n "$current_node" && "$current_node" != "$project_node" ]]; then
      warn "la shell usa $current_node; il progetto usa $project_node. Apri una nuova shell o usa 'mise exec --'."
    fi
  else
    fail "Node del progetto non installato. Esegui: mise install"
  fi
elif [[ -n "$current_node" ]]; then
  node_major="${current_node#v}"
  node_major="${node_major%%.*}"
  if ((node_major >= 24)); then
    ok "node $current_node"
  else
    warn "node $current_node: il progetto usa Node 24 LTS. Esegui: mise install"
  fi
else
  fail "node non trovato. Installa Node 24 LTS (mise)."
fi
check_command npm "Installa Node 24 LTS."

echo "== Docker =="
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "docker $(docker --version | awk '{print $3}' | tr -d ',')"
  else
    fail "docker non accessibile. Esegui: sudo usermod -aG docker \$USER, poi rientra."
  fi
else
  fail "docker non trovato. Serve per Supabase locale."
fi

echo "== Supabase CLI =="
if npx --no-install supabase --version >/dev/null 2>&1; then
  ok "supabase $(npx --no-install supabase --version 2>/dev/null)"
else
  fail "Supabase CLI non installato. Esegui: npm ci"
fi

echo "== Git =="
check_command git "Installa git."
hooks_path="$(git config --get core.hooksPath || true)"
if [[ "$hooks_path" == ".githooks" ]]; then
  ok "core.hooksPath = .githooks"
else
  warn "hook pre-push non attivo. Esegui: git config core.hooksPath .githooks"
fi
if git remote get-url origin >/dev/null 2>&1; then
  ok "remote origin: $(git remote get-url origin)"
else
  warn "remote origin non configurato."
fi

echo "== GitHub CLI =="
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    ok "gh autenticato"
  else
    warn "gh non autenticato. Esegui: gh auth login"
  fi
else
  warn "gh non trovato. Serve per PR e issue."
fi

echo "== Ambiente locale =="
if [[ -f .env.local ]]; then
  ok ".env.local presente"
else
  warn ".env.local assente. Dopo 'npm run db:start' esegui: npm run env:local"
fi
if npx --no-install supabase status >/dev/null 2>&1; then
  ok "stack Supabase locale attivo"
else
  warn "stack Supabase locale non attivo. Esegui: npm run db:start"
fi

if [[ "${1:-}" == "--verify" ]]; then
  echo "== Verify =="
  if npm run verify; then
    ok "npm run verify"
  else
    fail "npm run verify"
  fi
fi

echo
echo "Riepilogo: $failures errori, $warnings avvisi."
if ((failures > 0)); then
  exit 1
fi
