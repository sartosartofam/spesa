import { normalizeCategory } from '../categories'
import type { Item, ItemStatus, NewItem } from '../types'
import { identityKey, mergeItem, sortForView } from './item-merge'
import type { ItemsRepository } from './repository'

/**
 * Implementazione mock: nessuna rete, dati fittizi, persistenza in localStorage.
 * Serve a sviluppare e validare la UI prima del collegamento a Supabase.
 * Non contiene dati reali della famiglia (AGENTS.md §Sicurezza, punto 6).
 */

const STORAGE_KEY = 'spesa.mock.items.v2'
const MOCK_FAMILY_ID = '00000000-0000-4000-8000-000000000000'

interface SeedItem {
  name: string
  category: string
  status: ItemStatus
  urgent?: boolean
  note?: string | null
  quantity?: string | null
}

const SEED: ReadonlyArray<SeedItem> = [
  {
    name: 'Latte',
    category: 'Freschi',
    status: 'to_buy',
    quantity: '2 l',
    note: 'parzialmente scremato',
  },
  { name: 'Pane', category: 'Freschi', status: 'to_buy', quantity: '1' },
  {
    name: 'Detersivo piatti',
    category: 'Casa',
    status: 'to_buy',
    urgent: true,
    note: 'è finito',
  },
  { name: 'Pasta', category: 'Dispensa', status: 'to_buy', quantity: '3 pacchi' },
  { name: 'Mele', category: 'Frutta e verdura', status: 'to_buy', quantity: '1 kg' },
  { name: 'Caffè', category: 'Dispensa', status: 'bought', quantity: '1 confezione' },
  { name: 'Piselli', category: 'Surgelati', status: 'bought', quantity: '2' },
]

function nowIso(): string {
  return new Date().toISOString()
}

function makeItem(input: {
  name: string
  category: string | null
  status: ItemStatus
  urgent?: boolean
  note?: string | null
  quantity?: string | null
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
    urgent: input.status === 'bought' ? false : Boolean(input.urgent),
    note: input.note ?? null,
    quantity: input.quantity ?? null,
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

  /** Applica una modifica, unendo l'articolo in un eventuale duplicato. */
  function applyChange(id: string, updated: Item): Item {
    const duplicate = items.find(
      (candidate) => candidate.id !== id && identityKey(candidate) === identityKey(updated),
    )
    if (duplicate) {
      const merged = mergeItem(duplicate, updated)
      items = items
        .filter((candidate) => candidate.id !== id)
        .map((candidate) => (candidate.id === duplicate.id ? merged : candidate))
      persist()
      return merged
    }

    items = items.map((item) => (item.id === id ? updated : item))
    persist()
    return updated
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
        category: normalizeCategory(input.category),
        status: input.status ?? 'to_buy',
        urgent: input.urgent === true,
        note: input.note?.trim() || null,
        quantity: input.quantity?.trim() || null,
      })

      const duplicate = items.find((candidate) => identityKey(candidate) === identityKey(item))
      if (duplicate) {
        const merged = mergeItem(duplicate, item)
        items = items.map((candidate) => (candidate.id === duplicate.id ? merged : candidate))
        persist()
        return merged
      }

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
        urgent: status === 'bought' ? false : current.urgent,
        updated_at: nowIso(),
        bought_at: status === 'bought' ? nowIso() : null,
      }

      return applyChange(id, updated)
    },

    async update(id, patch) {
      await delay()
      const current = find(id)
      // Stessa regola del repository Supabase: un articolo in storico reso
      // urgente torna in lista, così l'update resta un'operazione sola.
      const promoting = current.status === 'bought' && patch.urgent === true
      const updated: Item = {
        ...current,
        name: patch.name?.trim() || current.name,
        category:
          patch.category === undefined ? current.category : normalizeCategory(patch.category),
        note: patch.note === undefined ? current.note : patch.note,
        quantity: patch.quantity === undefined ? current.quantity : patch.quantity,
        urgent: patch.urgent === undefined ? current.urgent : patch.urgent,
        status: promoting ? 'to_buy' : current.status,
        bought_at: promoting ? null : current.bought_at,
        updated_at: nowIso(),
      }

      return applyChange(id, updated)
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
