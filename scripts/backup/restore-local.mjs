#!/usr/bin/env node
// Ripristino di prova per l'export JSON (ADR-0003).
//
// Usa `node scripts/backup/restore-local.mjs <export.json>`:
// legge il file prodotto dalla Edge Function `export` e ricarica le righe
// nelle tabelle di `public`, in ordine di dipendenza, con upsert per id.
//
// Sicurezza:
// - usa la service_role solo in locale, leggendola da `supabase status`
//   oppure da SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY;
// - rifiuta URL che non puntano a localhost;
// - non stampa la chiave, solo i conteggi ripristinati.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TABLES = [
  'families',
  'members',
  'items',
  'family_invites',
  'push_subscriptions',
  'user_settings',
  'keepalive',
]

function readLocalSupabaseEnv() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      apiUrl: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  }

  const output = execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const values = new Map()
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/)
    if (match) values.set(match[1], match[2])
  }

  const apiUrl = values.get('API_URL')
  const serviceKey = values.get('SERVICE_ROLE_KEY')
  if (!apiUrl || !serviceKey) {
    throw new Error(
      'API_URL o SERVICE_ROLE_KEY assenti. Avvia Supabase locale con npm run db:start.',
    )
  }

  return { apiUrl, serviceKey }
}

function assertLocal(apiUrl) {
  const host = new URL(apiUrl).hostname
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Rifiuto di usare la service_role su ${apiUrl}: il restore è solo locale.`)
  }
}

function readExportFile(path) {
  if (!path) {
    console.error('Uso: node scripts/backup/restore-local.mjs <export.json>')
    process.exit(1)
  }
  const content = readFileSync(path, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Il file ${path} non è un JSON valido.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("La struttura dell'export non è riconosciuta.")
  }
  if (typeof parsed.tables !== 'object' || parsed.tables === null) {
    throw new Error("L'export non contiene la sezione `tables`.")
  }
  if (typeof parsed.exported_at !== 'string') {
    throw new Error("L'export non contiene `exported_at`.")
  }
  return parsed
}

const { tables, exported_at: exportedAt } = readExportFile(process.argv[2])
const { apiUrl, serviceKey } = readLocalSupabaseEnv()
assertLocal(apiUrl)

const admin = createClient(apiUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log(`Ripristino di prova da export del ${exportedAt} su ${apiUrl}`)

for (const table of TABLES) {
  const rows = tables[table]
  if (!Array.isArray(rows)) {
    console.log(`- ${table}: assente nell'export, salto`)
    continue
  }
  if (rows.length === 0) {
    console.log(`- ${table}: 0 righe`)
    continue
  }

  const { error } = await admin.from(table).upsert(rows)
  if (error) {
    console.error(`- ${table}: FAILED (${error.message})`)
    process.exit(1)
  }
  console.log(`- ${table}: ${rows.length} righe ripristinate`)
}

console.log('Restore di prova completato.')
