import type { Item, ItemStatus, ListView, NewItem } from '../types'
import type { ItemsRepository } from './repository'

/**
 * Implementazione mock: nessuna rete, dati fittizi, persistenza in localStorage.
 * Serve a sviluppare e validare la UI prima che lo schema backend esista.
 * Non contiene dati reali della famiglia (AGENTS.md §Sicurezza, punto 6).
 */

const STORAGE_KEY = 'spesa.mock.items.v1'
const MOCK_FAMILY_ID = '00000000-0000-4000-8000-000000000000'

const SEED: ReadonlyArray<Pick<Item, 'name' | 'category' | 'status' | 'note'>> = [
  { name: 'Latte', category: 'Freschi', status: 'to_buy', note: null },
  { name: 'Pane', category: 'Freschi', status: 'to_buy', note: null },
  { name: 'Detersivo piatti', category: 'Casa', status: 'finished', note: 'è finito' },
  { name: 'Pasta', category: 'Dispensa', status: 'to_buy', note: null },
  { name: 'Caffè', category: 'Dispensa', status: 'bought', note: null },
  { name: 'Piselli', category: 'Surgelati', status: 'bought', note: null },
]

const CATEGORIES = ['Dispensa', 'Freschi', 'Surgelati', 'Casa', 'Altro'] as const

function nowIso(): string {
  return new Date().toISOString()
}

function makeItem(input: {
  name: string
  category: string | null
  status: ItemStatus
  note: string | null
  quantity: string | null
  created_at?: string
  bought_at?: string | null
}): Item {
  const created_at = input.created_at ?? nowIso()
  return {
    id: crypto.randomUUID(),
    family_id: MOCK_FAMILY_ID,
    name: input.name,
    category: input.category,
    status: input.status,
    note: input.note,
    quantity: input.quantity,
    created_by: null,
    created_at,
    updated_at: created_at,
    bought_at: input.bought_at ?? null,
  }
}

function seedItems(): Item[] {
  const day = 24 * 60 * 60 * 1000
  const base = Date.now() - 3 * day
  return SEED.map((entry, index) =>
    makeItem({
      ...entry,
      quantity: null,
      created_at: new Date(base + index * 60_000).toISOString(),
      bought_at: entry.status === 'bought' ? new Date(base + index * 60_000).toISOString() : null,
    }),
  )
}

function read(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedItems()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedItems()
    return parsed as Item[]
  } catch {
    return seedItems()
  }
}

function write(items: Item[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage pieno o disabilitato: lo scaffold resta usabile in memoria.
  }
}

function delay(ms = 90): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const STATUS_ORDER: Record<ItemStatus, number> = {
  finished: 0,
  to_buy: 1,
  bought: 2,
}

function sortForView(items: Item[], view: ListView): Item[] {
  const visible = items.filter((item) =>
    view === 'active' ? item.status !== 'bought' : item.status === 'bought',
  )
  return visible.sort((a, b) => {
    if (view === 'history') {
      return (b.bought_at ?? b.updated_at).localeCompare(a.bought_at ?? a.updated_at)
    }
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (byStatus !== 0) return byStatus
    return a.name.localeCompare(b.name, 'it')
  })
}

export const CATEGORY_OPTIONS = CATEGORIES

export function createMockItemsRepository(): ItemsRepository {
  let items = read()

  function persist(): void {
    write(items)
  }

  function find(id: string): Item {
    const item = items.find((candidate) => candidate.id === id)
    if (!item) throw new Error(`Articolo non trovato: ${id}`)
    return item
  }

  return {
    async list(view) {
      await delay()
      return sortForView(items, view)
    },

    async add(input: NewItem) {
      await delay()
      const name = input.name.trim()
      if (!name) throw new Error("Il nome dell'articolo è obbligatorio.")
      const item = makeItem({
        name,
        category: input.category?.trim() || 'Altro',
        status: input.status ?? 'to_buy',
        note: input.note?.trim() || null,
        quantity: input.quantity?.trim() || null,
      })
      items = [item, ...items]
      persist()
      return item
    },

    async setStatus(id, status) {
      await delay()
      const current = find(id)
      const updated: Item = {
        ...current,
        status,
        updated_at: nowIso(),
        bought_at: status === 'bought' ? nowIso() : null,
      }
      items = items.map((item) => (item.id === id ? updated : item))
      persist()
      return updated
    },

    async update(id, patch) {
      await delay()
      const current = find(id)
      const updated: Item = {
        ...current,
        name: patch.name?.trim() || current.name,
        category: patch.category === undefined ? current.category : patch.category,
        note: patch.note === undefined ? current.note : patch.note,
        quantity: patch.quantity === undefined ? current.quantity : patch.quantity,
        updated_at: nowIso(),
      }
      items = items.map((item) => (item.id === id ? updated : item))
      persist()
      return updated
    },

    async remove(id) {
      await delay()
      items = items.filter((item) => item.id !== id)
      persist()
    },

    async suggestions() {
      await delay(30)
      const unique = new Set<string>()
      for (const item of items) unique.add(item.name)
      return [...unique].sort((a, b) => a.localeCompare(b, 'it'))
    },
  }
}
