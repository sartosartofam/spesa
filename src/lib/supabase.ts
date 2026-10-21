import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase per il browser.
 *
 * Sicurezza (AGENTS.md §Sicurezza): nel frontend può stare SOLO la chiave
 * pubblica (`anon` / publishable). Se in `.env.local` finisce per errore una
 * chiave segreta il client non viene creato e l'errore è esplicito.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

let client: SupabaseClient | null = null

function looksLikeSecretKey(key: string): boolean {
  return key.startsWith('sb_secret') || key.includes('service_role')
}

/**
 * Restituisce il client Supabase, oppure `null` se l'ambiente non è configurato.
 * Lo scaffold funziona senza backend: in quel caso la UI usa i dati mock.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !publishableKey) return null
  if (looksLikeSecretKey(publishableKey)) {
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY contiene una chiave segreta: usa solo la chiave pubblica (anon / publishable).',
    )
  }
  client ??= createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

/** True se `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` sono presenti. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey)
}
