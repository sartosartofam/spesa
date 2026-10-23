#!/usr/bin/env node
// Crea gli utenti Auth di test per lo stack Supabase locale e li collega alla
// famiglia demo creata da supabase/seed.sql.
//
// Sicurezza:
// - usa la service_role solo in locale, leggendola da `supabase status`;
// - rifiuta URL che non puntano a localhost;
// - non stampa la chiave, solo email e password demo.

import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const FAMILY_ID = '00000000-0000-4000-8000-000000000001'
const PASSWORD = 'spesa-demo-123'

const TEST_USERS = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    email: 'demo@spesa.test',
    displayName: 'Demo',
    role: 'owner',
    itemIds: [
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-000000001003',
      '00000000-0000-4000-8000-000000001004',
      '00000000-0000-4000-8000-000000001005',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    email: 'partner@spesa.test',
    displayName: 'Partner',
    role: 'member',
    itemIds: ['00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000001007'],
  },
]

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

  const apiUrl = process.env.SUPABASE_URL ?? values.get('API_URL')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? values.get('SERVICE_ROLE_KEY')
  if (!apiUrl || !serviceKey) {
    throw new Error(
      'API_URL o SERVICE_ROLE_KEY assenti. Avvia Supabase locale con npm run db:start.',
    )
  }

  const host = new URL(apiUrl).hostname
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Rifiuto di usare la service_role su ${apiUrl}: il seed è solo locale.`)
  }

  return { apiUrl, serviceKey }
}

async function ensureUser(admin, user) {
  const { data, error } = await admin.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: user.displayName },
  })

  if (!error) return data.user
  if (error.status !== 422 && !/already|exists|registered/i.test(error.message)) throw error

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw listError

  const existing = list.users.find((candidate) => candidate.email?.toLowerCase() === user.email)
  if (!existing) throw error

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: user.displayName },
  })
  if (updateError) throw updateError

  return updated.user
}

async function ensureMember(admin, authUser, testUser) {
  const { data: existing, error: selectError } = await admin
    .from('members')
    .select('id')
    .eq('family_id', FAMILY_ID)
    .eq('email', testUser.email)
    .maybeSingle()
  if (selectError) throw selectError

  if (existing && existing.id !== authUser.id) {
    throw new Error(
      `Il membro ${testUser.email} ha un id diverso dall'utente Auth. Esegui npm run db:reset.`,
    )
  }

  if (existing) {
    const { error } = await admin
      .from('members')
      .update({ display_name: testUser.displayName, role: testUser.role })
      .eq('id', authUser.id)
    if (error) throw error
    return
  }

  const { error } = await admin.from('members').insert({
    id: authUser.id,
    family_id: FAMILY_ID,
    email: testUser.email,
    display_name: testUser.displayName,
    role: testUser.role,
  })
  if (error) throw error
}

async function main() {
  const { apiUrl, serviceKey } = readLocalSupabaseEnv()
  const admin = createClient(apiUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const users = []
  for (const testUser of TEST_USERS) {
    const authUser = await ensureUser(admin, testUser)
    await ensureMember(admin, authUser, testUser)
    users.push({ testUser, authUser })
  }

  // Assegna gli articoli demo ai due membri senza sovrascrivere eventuali
  // modifiche fatte in locale.
  for (const { testUser, authUser } of users) {
    const { error } = await admin
      .from('items')
      .update({ created_by: authUser.id })
      .eq('family_id', FAMILY_ID)
      .in('id', testUser.itemIds)
      .is('created_by', null)
    if (error) throw error
  }

  console.log('Seed Auth locale completato.')
  console.log(`Famiglia demo: ${FAMILY_ID}`)
  for (const { testUser } of users) {
    console.log(`- ${testUser.email} (${testUser.role})`)
  }
  console.log(`Password locale: ${PASSWORD}`)
}

main().catch((error) => {
  console.error(`Seed Auth fallito: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
