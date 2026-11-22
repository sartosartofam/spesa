#!/usr/bin/env bash
# Drill di export e restore (ADR-0003) contro lo stack Supabase locale.
#
# Ripete a comando quello che il ripristino di prova deve dimostrare prima del
# go-live: che lo snapshot prodotto dalla Edge Function `export` basti a
# ricostruire i dati applicativi identici.
#
# Cosa fa, tutto in locale:
#   1. prepara stack e dati demo (`npm run db:reset`);
#   2. avvia la function `export` con un token usa-e-getta;
#   3. verifica che l'accesso sia protetto (401 senza token e con token errato);
#   4. esporta lo snapshot e confronta i conteggi con il database;
#   5. cancella i dati applicativi di `public` (non `auth`);
#   6. ripristina con `scripts/backup/restore-local.mjs`;
#   7. confronta lo stato ripristinato con quello di partenza, riga per riga.
#
# Esce 0 solo se il round-trip è identico. `auth.users` non è nell'export
# (limite dichiarato in ADR-0003): gli utenti Auth del seed restano in piedi,
# come servirebbe dopo un restore vero, e il drill controlla che non cambino.
#
# Uso: bash scripts/backup/drill.sh
# Distrugge i dati dello stack Supabase locale: non lanciarlo su un database
# che ti serve. Rifiuta qualunque URL che non sia localhost.

set -euo pipefail

cd "$(dirname "$0")/../.."

TABLES=(families members items family_invites push_subscriptions user_settings keepalive)

say() { printf '%s\n' "$*"; }
fail() {
  printf 'ERRORE: %s\n' "$*" >&2
  exit 1
}

WORK=''
SERVE_PID=''
cleanup() {
  if [[ -n "$SERVE_PID" ]] && kill -0 "$SERVE_PID" 2>/dev/null; then
    kill "$SERVE_PID" 2>/dev/null || true
    wait "$SERVE_PID" 2>/dev/null || true
  fi
  if [[ -n "$WORK" && -d "$WORK" ]]; then
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

# --- 1. stack locale ---------------------------------------------------------

STATUS_JSON=$(npx supabase status -o json 2>/dev/null || true)
if [[ -z "$STATUS_JSON" ]]; then
  say "Stack Supabase locale spento: lo avvio."
  bash scripts/db-start.sh >/dev/null
  STATUS_JSON=$(npx supabase status -o json 2>/dev/null || true)
fi
[[ -n "$STATUS_JSON" ]] || fail "lo stack locale non parte (vedi scripts/db-start.sh)"

read -r API_URL DB_URL < <(
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(`${j.API_URL} ${j.DB_URL}\n`)})' <<<"$STATUS_JSON"
)
[[ -n "$API_URL" && -n "$DB_URL" ]] || fail "status dello stack incompleto"

case "$API_URL" in
  http://127.0.0.1:* | http://localhost:*) ;;
  *) fail "API_URL non locale ($API_URL): il drill gira solo sullo stack locale" ;;
esac

# --- 2. dati demo e function -------------------------------------------------

say "Preparo i dati demo (db reset + utenti Auth)..."
npm run db:reset

WORK=$(mktemp -d "${TMPDIR:-/tmp}/spesa-drill.XXXXXX")
chmod 700 "$WORK"
EXPORT_TOKEN=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(16).toString("hex"))')
printf 'EXPORT_TOKEN=%s\n' "$EXPORT_TOKEN" >"$WORK/export.env"
chmod 600 "$WORK/export.env"

say "Avvio la Edge Function export..."
npx supabase functions serve export --env-file "$WORK/export.env" >"$WORK/serve.log" 2>&1 &
SERVE_PID=$!

code=000
for _ in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/functions/v1/export" 2>/dev/null || true)
  case "$code" in
    000 | 502 | 503 | 504) ;;
    *) break ;;
  esac
  sleep 2
done
if [[ "$code" == "000" || "$code" == "502" || "$code" == "503" || "$code" == "504" ]]; then
  tail -20 "$WORK/serve.log" >&2 || true
  fail "la function export non risponde su $API_URL"
fi

# --- 3. accesso protetto -----------------------------------------------------

no_token=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/functions/v1/export")
[[ "$no_token" == "401" ]] || fail "senza token atteso 401, ricevuto $no_token"

bad_token=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/functions/v1/export" -H 'authorization: Bearer token-sbagliato')
[[ "$bad_token" == "401" ]] || fail "con token errato atteso 401, ricevuto $bad_token"
say "  accesso protetto: 401 senza token e con token errato"

# --- 4. export ---------------------------------------------------------------

curl -fsS -X POST "$API_URL/functions/v1/export" \
  -H "authorization: Bearer $EXPORT_TOKEN" -o "$WORK/export.json"
[[ -s "$WORK/export.json" ]] || fail "export vuoto"

snapshot() {
  local parts='' t
  for t in "${TABLES[@]}"; do
    parts+="'$t', (select coalesce(jsonb_agg(to_jsonb(x) order by (to_jsonb(x) - 'updated_at')::text), '[]'::jsonb) from public.$t x),"
  done
  psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 -c "select jsonb_pretty(jsonb_build_object(${parts%,}))"
}

db_counts() {
  local parts='' t
  for t in "${TABLES[@]}"; do
    parts+="'$t', (select count(*) from public.$t),"
  done
  psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 -c "select jsonb_build_object(${parts%,})"
}

snapshot >"$WORK/before.json"
db_counts >"$WORK/db-counts.json"
auth_before=$(psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 -c 'select count(*) from auth.users')

node -e '
const fs = require("node:fs")
const exported = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const actual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const keys = [...new Set([...Object.keys(exported.counts), ...Object.keys(actual)])].sort()
const bad = keys.filter((k) => (exported.counts[k] ?? 0) !== (actual[k] ?? 0))
if (bad.length) {
  for (const k of bad) console.error(`  ${k}: export ${exported.counts[k] ?? 0}, database ${actual[k] ?? 0}`)
  process.exit(1)
}
console.log(`  conteggi export = database: ${keys.map((k) => `${k} ${actual[k]}`).join(", ")}`)
' "$WORK/export.json" "$WORK/db-counts.json"

# --- 5. perdita simulata -----------------------------------------------------

say "Cancello i dati applicativi (le tabelle di public, non auth)..."
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "
  begin;
  delete from public.family_invites;
  delete from public.push_subscriptions;
  delete from public.items;
  delete from public.user_settings;
  delete from public.members;
  delete from public.families;
  delete from public.keepalive;
  commit;
"
wiped=$(db_counts)
node -e '
const counts = JSON.parse(process.argv[1])
const nonZero = Object.entries(counts).filter(([, v]) => v !== 0)
if (nonZero.length) {
  console.error(`  ancora popolate: ${nonZero.map(([k, v]) => `${k} ${v}`).join(", ")}`)
  process.exit(1)
}
' "$wiped" || fail "la cancellazione non ha svuotato le tabelle"
say "  tabelle svuotate"

# --- 6. restore --------------------------------------------------------------

say "Ripristino dallo snapshot (tabelle vuote, come in un restore vero)..."
node scripts/backup/restore-local.mjs "$WORK/export.json"

# --- 7. confronto del round-trip ---------------------------------------------

snapshot >"$WORK/after.json"
auth_after=$(psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 -c 'select count(*) from auth.users')

[[ "$auth_before" == "$auth_after" ]] ||
  fail "auth.users è cambiata durante il drill ($auth_before -> $auth_after)"

if ! diff -u "$WORK/before.json" "$WORK/after.json" >"$WORK/diff.txt"; then
  say "Differenze tra stato di partenza e stato ripristinato:"
  cat "$WORK/diff.txt" >&2
  fail "il round-trip non è identico"
fi
say "  round-trip identico su tutte e 7 le tabelle"

# --- 8. restore ripetuto -----------------------------------------------------
#
# Un restore reale si può dover ritentare. L'upsert non deve duplicare righe
# né cambiare i dati, ma il trigger `updated_at` riscrive quel timestamp su
# ogni riga che passa da un UPDATE: è un effetto atteso del trigger, non una
# perdita di dati, e il confronto lo esclude.

say "Ripristino una seconda volta (un restore si può ritentare)..."
node scripts/backup/restore-local.mjs "$WORK/export.json" >/dev/null
snapshot >"$WORK/after-retry.json"

node -e '
const fs = require("node:fs")
const strip = (v) =>
  Array.isArray(v) ? v.map(strip)
  : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "updated_at").map(([k, x]) => [k, strip(x)]))
    : v
const a = strip(JSON.parse(fs.readFileSync(process.argv[1], "utf8")))
const b = strip(JSON.parse(fs.readFileSync(process.argv[2], "utf8")))
if (JSON.stringify(a) !== JSON.stringify(b)) {
  console.error("  il secondo restore ha cambiato i dati oltre a updated_at")
  process.exit(1)
}
console.log("  nessuna riga duplicata, nessun dato cambiato (updated_at riscritto dal trigger: atteso)")
' "$WORK/after.json" "$WORK/after-retry.json" || fail "il restore ripetuto non è stabile"

say ""
say "Drill completato: export -> cancellazione -> restore produce lo stesso contenuto, riga per riga,"
say "e un secondo restore non duplica né altera nulla."
say "Tabelle confrontate: ${TABLES[*]}"
