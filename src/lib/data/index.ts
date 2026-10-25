import { getSupabase, isSupabaseConfigured } from '../supabase'
import { createMockItemsRepository } from './mock-repository'
import type { ItemsRepository } from './repository'
import { createSupabaseItemsRepository } from './supabase-repository'

type DataMode = 'mock' | 'supabase'

/**
 * Punto di composizione dell'accesso ai dati.
 *
 * - `VITE_DATA_MODE=mock` forza i dati locali (test, demo, e2e senza backend);
 * - `VITE_DATA_MODE=supabase` richiede un ambiente Supabase configurato;
 * - senza la variabile: Supabase se configurato, altrimenti mock.
 *
 * Il client e il repository sono creati in modo lazy: la landing pubblica non
 * deve fallire se mancano `VITE_SUPABASE_URL` o la chiave pubblica.
 */
export function resolveDataMode(mode: string | undefined, configured: boolean): DataMode {
  switch (mode?.trim().toLowerCase()) {
    case 'mock':
      return 'mock'
    case 'supabase':
      return 'supabase'
    default:
      return configured ? 'supabase' : 'mock'
  }
}

const mode = resolveDataMode(import.meta.env.VITE_DATA_MODE, isSupabaseConfigured())

let repository: ItemsRepository | null = null

function resolve(): ItemsRepository {
  if (repository) return repository
  if (mode === 'mock') {
    repository = createMockItemsRepository()
    return repository
  }
  const client = getSupabase()
  if (!client) {
    throw new Error(
      'Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY oppure VITE_DATA_MODE=mock.',
    )
  }
  repository = createSupabaseItemsRepository(client)
  return repository
}

export const itemsRepository: ItemsRepository = {
  list: (view) => resolve().list(view),
  add: (input) => resolve().add(input),
  setStatus: (id, status) => resolve().setStatus(id, status),
  update: (id, patch) => resolve().update(id, patch),
  remove: (id) => resolve().remove(id),
  suggestions: () => resolve().suggestions(),
}

/** True quando i dati arrivano dal database reale invece che dal mock. */
export const isLiveData = mode === 'supabase'
