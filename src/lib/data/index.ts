import { createMockItemsRepository } from './mock-repository'
import type { ItemsRepository } from './repository'

/**
 * Punto di composizione dell'accesso ai dati.
 *
 * Oggi: sempre mock, perché lo schema backend non è ancora mergiato su `dev`.
 * Prossimo passo (dopo il merge del backend): implementazione Supabase e scelta
 * qui, senza toccare hook e componenti.
 */
export const itemsRepository: ItemsRepository = createMockItemsRepository()

/** True quando i dati arrivano dal database reale invece che dal mock. */
export const isLiveData = false

export type { ItemsRepository }
