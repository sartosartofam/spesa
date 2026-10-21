/**
 * Tipi provvisori allineati allo schema in AGENTS.md ("Schema dati — fase 1").
 *
 * ATTENZIONE: lo schema backend non è ancora mergiato su `dev`. Questi tipi sono
 * un contratto di lavoro per lo scaffold e vanno riallineati alla migrazione
 * reale (e ai tipi generati da Supabase) prima di collegare il database.
 */

export type ItemStatus = 'to_buy' | 'bought' | 'finished'

export interface Family {
  id: string
  name: string
  created_at: string
}

export interface Member {
  id: string
  family_id: string
  email: string
  display_name: string
  /** Valori non ancora fissati dallo schema: per l'MVP si usa `owner` | `member`. */
  role: string
  created_at: string
}

export interface Item {
  id: string
  family_id: string
  name: string
  category: string | null
  status: ItemStatus
  note: string | null
  /** Formato non ancora deciso (§A3): per ora testo libero, può essere null. */
  quantity: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  bought_at: string | null
}

/** Campi minimi per aggiungere un articolo alla lista. */
export interface NewItem {
  name: string
  category?: string | null
  note?: string | null
  quantity?: string | null
  status?: Extract<ItemStatus, 'to_buy' | 'finished'>
}

/** Vista della UI: lista attiva (da comprare + finito) oppure storico (comprato). */
export type ListView = 'active' | 'history'
