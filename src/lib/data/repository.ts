import type { Item, ItemStatus, ListView, NewItem } from '../types'

/**
 * Contratto di accesso ai dati della lista.
 *
 * Lo scaffold espone solo l'implementazione mock (`mock-repository.ts`).
 * Quando lo schema backend sarà collegato, si aggiunge un'implementazione
 * Supabase e si cambia solo il punto di composizione in `data/index.ts`:
 * componenti e hook restano invariati.
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
