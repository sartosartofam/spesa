import type { Item, ItemStatus, ListView, NewItem } from '../types'

/**
 * Contratto di accesso ai dati della lista.
 *
 * Implementazioni: `mock-repository.ts` (dati locali, test e demo) e
 * `supabase-repository.ts` (database reale, filtrato dalla RLS). Il punto di
 * composizione è `data/index.ts`: componenti e hook restano invariati.
 */
export interface ItemsRepository {
  /** Articoli di una vista: lista attiva oppure storico. */
  list(view: ListView): Promise<Item[]>
  add(input: NewItem): Promise<Item>
  setStatus(id: string, status: ItemStatus): Promise<Item>
  update(
    id: string,
    patch: Partial<Pick<Item, 'name' | 'category' | 'note' | 'quantity' | 'urgent'>>,
  ): Promise<Item>
  remove(id: string): Promise<void>
  /** Nomi già usati, per i suggerimenti del campo di aggiunta. */
  suggestions(): Promise<string[]>
}
