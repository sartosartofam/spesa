import type { Item } from './types'

/** Fotografia della lista usata per annullare o ripetere un'azione. */
export interface ListSnapshot {
  active: Item[]
  history: Item[]
}

export interface ListHistoryEntry {
  label: string
  before: ListSnapshot
  after: ListSnapshot
}

export type SnapshotOperation = { type: 'remove'; id: string } | { type: 'restore'; item: Item }

function itemsById(snapshot: ListSnapshot): Map<string, Item> {
  return new Map([...snapshot.active, ...snapshot.history].map((item) => [item.id, item]))
}

function sameItem(a: Item, b: Item): boolean {
  return (
    a.name === b.name &&
    a.category === b.category &&
    a.status === b.status &&
    a.urgent === b.urgent &&
    a.note === b.note &&
    a.quantity === b.quantity &&
    a.bought_at === b.bought_at
  )
}

/**
 * Operazioni necessarie per trasformare `source` in `target`.
 *
 * Il confronto per id copre anche i merge del repository: se un'azione ha
 * assorbito una riga dentro un'altra, l'undo ripristina entrambe le righe
 * originali e il redo le riassorbe.
 */
export function snapshotOperations(
  target: ListSnapshot,
  source: ListSnapshot,
): SnapshotOperation[] {
  const targetItems = itemsById(target)
  const sourceItems = itemsById(source)
  const operations: SnapshotOperation[] = []

  for (const id of sourceItems.keys()) {
    if (!targetItems.has(id)) operations.push({ type: 'remove', id })
  }

  for (const [id, item] of targetItems) {
    const current = sourceItems.get(id)
    if (!current || !sameItem(current, item)) {
      operations.push({ type: 'restore', item })
    }
  }

  return operations
}
