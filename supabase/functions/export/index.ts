// Export settimanale dati app (ADR-0003).
//
// La function risponde con un JSON contenente le righe delle tabelle
// applicative di `public` (nessuna riga di `auth`, non percorribile via
// REST). L'upload vero e proprio su R2/B2 è a carico del chiamante (cron
// Pi o GitHub Actions): la function si limita a produrre lo snapshot.
//
// Accesso: solo chiamanti con l'header `Authorization: Bearer <EXPORT_TOKEN>`,
// token dedicato gestito dall'umano (secret Supabase in produzione).
// Mai usare JWT utente né service_role dal chiamante.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Tabelle in ordine di dipendenza per un eventuale restore: prima le
// famiglie, poi i membri, poi le tabelle che referenziano entrambe.
const TABLES: Array<string> = [
  'families',
  'members',
  'items',
  'family_invites',
  'push_subscriptions',
  'user_settings',
  'keepalive',
]

function timingSafeEqualHex(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let mismatch = 0
  for (let i = 0; i < aBytes.length; i += 1) mismatch |= aBytes[i] ^ bBytes[i]
  return mismatch === 0
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function tokenMatches(expected: string, provided: string): Promise<boolean> {
  // Confronto su SHA-256: indipendente dalla lunghezza dell'input e
  // resistente al timing side-channel.
  const [expectedHash, providedHash] = await Promise.all([sha256Hex(expected), sha256Hex(provided)])
  return timingSafeEqualHex(expectedHash, providedHash)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  const exportToken = Deno.env.get('EXPORT_TOKEN')?.trim()
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_not_configured' }, 500)
  if (!exportToken) return json({ error: 'export_not_configured' }, 503)

  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
  const providedToken = authHeader.slice('Bearer '.length).trim()
  if (!providedToken || !(await tokenMatches(exportToken, providedToken))) {
    console.error('export: token rifiutato')
    return json({ error: 'unauthorized' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Nessuna select arbitraria: allowlist fissa delle tabelle.
  const tables: Record<string, Array<Record<string, unknown>>> = {}
  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    const { data, error } = await admin.from(table).select('*')
    if (error) {
      console.error(`export: lettura ${table} fallita`)
      return json({ error: 'internal_error' }, 500)
    }
    const rows = (data ?? []).filter(isRecord)
    tables[table] = rows
    counts[table] = rows.length
  }

  console.error('export: snapshot pronto')

  return json(
    {
      version: 1,
      exported_at: new Date().toISOString(),
      counts,
      tables,
    },
    200,
  )
})
