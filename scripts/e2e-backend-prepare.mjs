#!/usr/bin/env node
// Prepara lo stack Supabase locale per gli e2e con backend reale.
//
// Sicurezza:
// - legge la service_role da `supabase status` e rifiuta qualsiasi URL non
//   locale;
// - non esegue reset né cancellazioni: se la famiglia demo manca si ferma e
//   chiede `npm run db:reset`, così nessun dato locale viene perso;
// - crea/aggiorna gli utenti demo in modo idempotente con scripts/seed-auth.mjs.

import { execFileSync } from 'node:child_process'

const FAMILY_ID = '00000000-0000-4000-8000-000000000001'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

function readLocalSupabaseEnv() {
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

  const host = new URL(apiUrl).hostname
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Rifiuto di usare la service_role su ${apiUrl}: gli e2e sono solo locali.`)
  }

  return { apiUrl, serviceKey }
}

async function demoFamilyExists({ apiUrl, serviceKey }) {
  const response = await fetch(`${apiUrl}/rest/v1/families?select=id&id=eq.${FAMILY_ID}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
  })
  if (!response.ok) {
    throw new Error(`Lettura delle famiglie fallita (HTTP ${response.status}).`)
  }
  const rows = await response.json()
  return Array.isArray(rows) && rows.length > 0
}

async function main() {
  const env = readLocalSupabaseEnv()

  if (!(await demoFamilyExists(env))) {
    throw new Error(
      'Famiglia demo assente nello stack locale. Esegui npm run db:reset (solo locale) e riprova.',
    )
  }

  // Idempotente: crea gli utenti Auth mancanti e li collega alla famiglia demo.
  execFileSync('node', ['scripts/seed-auth.mjs'], { stdio: 'inherit' })
  console.log('[e2e-backend] stack locale pronto.')
}

main().catch((error) => {
  console.error(
    `[e2e-backend] preparazione fallita: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
})
