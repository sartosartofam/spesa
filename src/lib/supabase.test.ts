import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `supabase.ts` legge le variabili a livello di modulo: ogni caso ricarica il
 * modulo dopo aver impostato l'ambiente, così verifichiamo davvero i tre
 * percorsi (non configurato, configurato, chiave segreta per errore).
 */
async function loadModule(env: { url?: string; key?: string }) {
  vi.resetModules()
  // Vitest carica `.env.local`: forziamo i valori per ogni caso, compreso il
  // caso "non configurato", altrimenti il test dipenderebbe dalla macchina.
  vi.stubEnv('VITE_SUPABASE_URL', env.url ?? '')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', env.key ?? '')
  return import('./supabase')
}

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('senza configurazione restituisce null e non crea il client', async () => {
    const { getSupabase, isSupabaseConfigured } = await loadModule({})
    expect(isSupabaseConfigured()).toBe(false)
    expect(getSupabase()).toBeNull()
  })

  it('con URL e chiave pubblica crea il client una sola volta', async () => {
    const { getSupabase, isSupabaseConfigured } = await loadModule({
      url: 'http://127.0.0.1:54321',
      key: 'anon-public-key',
    })

    expect(isSupabaseConfigured()).toBe(true)
    const first = getSupabase()
    expect(first).not.toBeNull()
    expect(getSupabase()).toBe(first)
  })

  it('rifiuta una chiave segreta al posto della pubblica', async () => {
    const { getSupabase } = await loadModule({
      url: 'http://127.0.0.1:54321',
      key: 'sb_secret_1234567890',
    })

    expect(() => getSupabase()).toThrow(/chiave segreta/i)
  })

  it('rifiuta anche una chiave che contiene service_role', async () => {
    const { getSupabase } = await loadModule({
      url: 'http://127.0.0.1:54321',
      key: 'eyJhbGciOiJIUzI1NiJ9.service_role.firma',
    })

    expect(() => getSupabase()).toThrow(/chiave segreta/i)
  })
})
