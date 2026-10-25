/**
 * Tipi della lista, allineati allo schema reale su `dev` (ADR-0001):
 * `status` ha due soli valori e l'urgenza è il flag booleano `urgent`.
 */

export type ItemStatus = 'to_buy' | 'bought'

export interface Item {
  id: string
  family_id: string
  name: string
  category: string | null
  status: ItemStatus
  /** "È finito": l'articolo va comprato subito. */
  urgent: boolean
  note: string | null
  /** Testo libero, es. "2 pacchi", "500 g". */
  quantity: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  bought_at: string | null
}

/** Campi per aggiungere un articolo alla lista. */
export interface NewItem {
  name: string
  category?: string | null
  note?: string | null
  quantity?: string | null
  urgent?: boolean
  status?: Extract<ItemStatus, 'to_buy'>
}

/** Vista della UI: lista attiva oppure storico. */
export type ListView = 'active' | 'history'
