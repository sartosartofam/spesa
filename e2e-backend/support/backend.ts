import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, type Page } from '@playwright/test'

/**
 * Helper condivisi dagli e2e con backend reale.
 *
 * L'app gira contro lo stack Supabase locale avviato da
 * `scripts/e2e-backend.sh`; le credenziali demo arrivano dal seed
 * (`scripts/seed-auth.mjs`). Nessun dato reale, nessun cloud.
 */

export const DEMO_EMAIL = 'demo@spesa.test'
export const DEMO_PASSWORD = 'spesa-demo-123'

/**
 * Prefisso degli articoli creati dai test. Il teardown globale cancella tutti
 * quelli rimasti, compresi quelli di una run interrotta a metà.
 */
export const E2E_ITEM_PREFIX = 'E2E-backend'

interface LocalEnv {
  url: string
  anonKey: string
}

/** Legge URL e anon key locali da `.env.local` (generato da `npm run env:local`). */
export function readLocalEnv(): LocalEnv {
  const path = resolve(process.cwd(), '.env.local')
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    throw new Error(
      `.env.local mancante (${path}). Esegui npm run env:local o npm run test:e2e:backend.`,
    )
  }

  const values = new Map<string, string>()
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=("?)(.*?)\2$/)
    if (match) values.set(match[1] as string, match[3] as string)
  }

  const url = values.get('VITE_SUPABASE_URL')
  const anonKey = values.get('VITE_SUPABASE_PUBLISHABLE_KEY')
  if (!url || !anonKey) {
    throw new Error(
      '.env.local non contiene VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY: esegui npm run env:local.',
    )
  }
  return { url, anonKey }
}

/** Nome articolo univoco per la run: evita collisioni con seed e run precedenti. */
export function uniqueItemName(label: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${E2E_ITEM_PREFIX} ${label} ${suffix}`
}

let tokenPromise: Promise<string> | null = null

/** Access token dell'utente demo via REST, usato solo per la pulizia finale. */
function demoAccessToken(): Promise<string> {
  tokenPromise ??= (async () => {
    const { url, anonKey } = readLocalEnv()
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    })
    if (!response.ok) {
      throw new Error(`Login REST fallito (HTTP ${response.status}).`)
    }
    const body = (await response.json()) as { access_token?: string }
    if (!body.access_token) throw new Error('Risposta Auth senza access_token.')
    return body.access_token
  })()
  return tokenPromise
}

/**
 * Cancella gli articoli creati dai test (attivi e in storico). Best-effort: la
 * pulizia non deve far fallire una run già conclusa.
 */
export async function deleteE2eItems(): Promise<number> {
  const { url, anonKey } = readLocalEnv()
  const token = await demoAccessToken()
  const response = await fetch(
    `${url}/rest/v1/items?name=like.${encodeURIComponent(`${E2E_ITEM_PREFIX}*`)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${token}`,
        prefer: 'return=representation',
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Pulizia articoli e2e fallita (HTTP ${response.status}).`)
  }
  const deleted = (await response.json()) as unknown[]
  return Array.isArray(deleted) ? deleted.length : 0
}

/**
 * Login reale con l'utente demo e verifica che l'app usi il backend.
 *
 * Il footer mostra "modalità demo · dati locali" solo con i dati mock: la sua
 * assenza garantisce che la suite non stia testando il repository locale.
 */
export async function signInAsDemo(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(DEMO_EMAIL)
  await page.getByLabel('Password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(page.getByText('modalità demo · dati locali')).toHaveCount(0)
}
