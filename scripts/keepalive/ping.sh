#!/usr/bin/env bash
# Ping giornaliero alla tabella keepalive, lato Raspberry Pi.
# Cron suggerito (03:00): 0 3 * * * /path/to/scripts/keepalive/ping.sh
#
# Richiede SUPABASE_URL e SUPABASE_ANON_KEY nell'ambiente (o in un file
# sorgente non versionato). Solo la anon key: mai la service_role sul Pi.

set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL non impostata}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY non impostata}"

curl -fsS --retry 3 --max-time 20 \
  "$SUPABASE_URL/rest/v1/keepalive?select=*&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
