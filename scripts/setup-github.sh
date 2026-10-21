#!/usr/bin/env bash
# Crea label e issue di partenza su GitHub. Richiede `gh auth login`.
# Non modifica branch protection né default branch: stampa i comandi da eseguire.
# Uso: bash scripts/setup-github.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "gh non trovato. Installa GitHub CLI." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "gh non autenticato. Esegui: gh auth login" >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repository: $repo"

label() {
  gh label create "$1" --color "$2" --description "$3" --force >/dev/null
}

label "agent:backend" "1d76db" "Task per l'agente backend"
label "agent:frontend" "0e8a16" "Task per l'agente frontend"
label "agent:qa" "5319e7" "Task per l'agente QA"
label "agent:ready" "fbca04" "Pronto per essere preso da un agente"
label "blocked:human" "b60205" "Richiede un'azione umana"
label "security" "d93f0b" "Richiede review umana prima di main"

issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  local existing
  existing="$(gh issue list --state all --search "$title in:title" --json title -q '.[].title' 2>/dev/null || true)"
  if printf '%s\n' "$existing" | grep -Fxq "$title"; then
    echo "  skip  $title"
    return
  fi
  gh issue create --title "$title" --body "$body" --label "$labels" >/dev/null
  echo "  creato $title"
}

echo "Issue:"
issue "[backend] Schema iniziale" "agent:backend,agent:ready" \
"Implementare enum \`item_status\` e tabelle \`families\`, \`members\`, \`items\`, \`push_subscriptions\` con chiavi, indici e trigger \`updated_at\`/\`bought_at\`.

Riferimenti: \`AGENTS.md\` (Schema dati), \`docs/DECISIONS.md\` ADR-0001.

Acceptance:
- [ ] \`npm run db:reset\` pulito
- [ ] test pgTAP di struttura
- [ ] \`npm run db:types\` aggiornato
- [ ] \`npm run verify\` verde"

issue "[backend] RLS e test di isolamento" "agent:backend,agent:ready,security" \
"Abilitare RLS su tutte le tabelle e scrivere le policy per famiglia. Test pgTAP di isolamento tra due famiglie e accesso anonimo negato.

Usa la skill \`rls-review\`.

Acceptance:
- [ ] RLS attiva su ogni tabella
- [ ] test: famiglia A non vede/modifica dati di B
- [ ] anon non legge items/members/push_subscriptions
- [ ] \`npx supabase test db\` verde"

issue "[backend] Seed, utenti test e tipi generati" "agent:backend,agent:ready" \
"Creare famiglia fittizia, membri e articoli di esempio. Script per utenti di test locali e generazione tipi TypeScript.

Acceptance:
- [ ] seed senza dati reali
- [ ] login locale con utente test
- [ ] \`npm run db:types\` riproducibile
- [ ] documentato in \`docs/SETUP.md\`"

issue "[frontend] Auth email+password" "agent:frontend,agent:ready" \
"Schermata login/logout, gestione sessione Supabase, route protette e messaggi di errore. Nessuna registrazione pubblica.

Acceptance:
- [ ] login con utente test
- [ ] sessione persistente al reload
- [ ] logout
- [ ] test e2e"

issue "[frontend] Repository Supabase" "agent:frontend,agent:ready" \
"Implementare \`ItemsRepository\` con Supabase e selezionarlo in \`src/lib/data/index.ts\`. Il mock resta per test e demo.

Acceptance:
- [ ] CRUD reale filtrato dalla RLS
- [ ] loading/errori gestiti
- [ ] test unit o e2e
- [ ] nessuna chiamata diretta a Supabase nei componenti"

issue "[frontend] Realtime" "agent:frontend,agent:ready" \
"Sottoscrizione Postgres changes per la lista della famiglia, con aggiornamento ottimistico e riconciliazione.

Acceptance:
- [ ] due browser vedono l'aggiunta entro 1 s
- [ ] nessun loop di refresh
- [ ] cleanup della subscription"

issue "[backend] Segnalazione è finito e Web Push" "agent:backend,agent:frontend,agent:ready,security" \
"Flag \`urgent\`, Edge Function per Web Push, UI di subscribe/revoca. Feature flag per disabilitare le push in locale.

Acceptance:
- [ ] notifica su aggiunta/urgenza
- [ ] subscription salvata per membro
- [ ] revoca funzionante
- [ ] nessuna chiave VAPID nel repo"

issue "[frontend] PWA offline" "agent:frontend,agent:ready" \
"Service worker, icone 192/512, app shell offline e banner stato rete. Nessuna coda di scritture per l'MVP.

Acceptance:
- [ ] app installabile
- [ ] shell disponibile senza rete
- [ ] ultima lista in lettura
- [ ] nessun errore console offline"

issue "[qa] E2E completi" "agent:qa,agent:ready" \
"Coprire login, aggiunta, spunta, storico, segnalazione è finito e revoca push.

Acceptance:
- [ ] suite stabile in CI
- [ ] dati fittizi
- [ ] nessuna dipendenza dalla produzione"

issue "[ops] Export e restore" "blocked:human,security" \
"Edge Function \`export\` con token dedicato, upload su R2/B2 e procedura di restore documentata. Richiede decisioni e secret umani.

Acceptance:
- [ ] export eseguito almeno una volta
- [ ] restore di prova riuscito
- [ ] \`service_role\` solo lato Supabase
- [ ] documento \`docs/BACKUP.md\`"

cat <<'EOF'

Fatto. Impostazioni GitHub da fare a mano (una volta):

1. Default branch su dev:
   gh repo edit --default-branch dev

2. Abilita auto-merge:
   gh api -X PATCH "repos/$(gh repo view --json nameWithOwner -q .nameWithOwner)" -f allow_auto_merge=true

3. Branch protection (UI GitHub → Settings → Branches):
   - main: richiedi PR + CI verde, no push diretti
   - dev: richiedi PR + CI verde, consenti auto-merge/squash

4. Secrets per il keepalive (Settings → Secrets and variables → Actions):
   SUPABASE_URL, SUPABASE_ANON_KEY

Nota: non abilitare "Require review from Code Owners" su dev, altrimenti
l'auto-merge degli agenti resta bloccato.
EOF
