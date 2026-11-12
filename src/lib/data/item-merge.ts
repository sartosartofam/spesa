import { categoryRank, normalizeCategory } from '../categories'
import { mergeQuantities } from '../quantity'
import type { Item, ListView } from '../types'

/**
 * Regole condivise da mock e Supabase.
 *
 * Due articoli sono lo stesso prodotto se hanno lo stesso nome e la stessa
 * categoria nella stessa vista (attiva o storico). Note e urgenza non creano
 * righe separate: la nota viene conservata e l'urgenza si somma con OR.
 *
 * Nota backend: l'integrità è garantita anche dal database con l'indice
 * unique `items_family_status_identity_key` su
 * (family_id, status, lower(btrim(name)), lower(btrim(category))): il merge
 * amichevole resta lato client, il vincolo copre le gare tra membri.
 */

export function identityKey(item: Pick<Item, 'status' | 'name' | 'category'>): string {
  return JSON.stringify([
    item.status,
    item.name.trim().toLocaleLowerCase('it'),
    normalizeCategory(item.category).toLocaleLowerCase('it'),
  ])
}

export function mergeItem(target: Item, source: Item, now = new Date().toISOString()): Item {
  return {
    ...target,
    quantity: mergeQuantities(target.quantity, source.quantity),
    note: target.note?.trim() ? target.note : source.note,
    urgent: target.urgent || source.urgent,
    updated_at: now,
  }
}

/** Filtra per vista e ordina come la UI: urgenti in cima, storico dal più recente. */
export function sortForView(items: Item[], view: ListView): Item[] {
  const visible = items.filter((item) =>
    view === 'active' ? item.status !== 'bought' : item.status === 'bought',
  )
  if (view === 'history') {
    return visible.sort((a, b) =>
      (b.bought_at ?? b.updated_at).localeCompare(a.bought_at ?? a.updated_at),
    )
  }
  return visible.sort(
    (a, b) =>
      Number(b.urgent) - Number(a.urgent) ||
      categoryRank(normalizeCategory(a.category)) - categoryRank(normalizeCategory(b.category)) ||
      a.name.localeCompare(b.name, 'it'),
  )
}
