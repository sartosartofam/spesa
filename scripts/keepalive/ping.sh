#!/usr/bin/env bash
# Ping giornaliero alla tabella keepalive, lato Raspberry Pi.
# Cron suggerito (03:00): 0 3 * * * /path/to/scripts/keepalive/ping.sh
#
# Richiede SUPABASE_URL e SUPABASE_ANON_KEY nell'ambiente (o in un file
# sorgente non versionato). Solo la anon key: mai la service_role sul Pi.
#
# Chiama la RPC `ping_keepalive()`: una query reale sul database (tiene sveglio
# il progetto free) che in più registra `keepalive.last_ping`, così il pannello
# admin mostra l'ora dell'ultimo battito e non la data della migrazione.
# La funzione accetta solo `anon` e tocca una colonna di una riga.

set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL non impostata}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY non impostata}"

curl -fsS --retry 3 --max-time 20 \
  -X POST "$SUPABASE_URL/rest/v1/rpc/ping_keepalive" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
