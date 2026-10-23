import { categoryRank, normalizeCategory } from './categories'
import type { Item } from './types'

/** Urgenti prima, poi ordine alfabetico. */
export function sortActive(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) => Number(b.urgent) - Number(a.urgent) || a.name.localeCompare(b.name, 'it'),
  )
}

/** Più recenti prima. */
export function sortHistory(items: Item[]): Item[] {
  return [...items].sort((a, b) =>
    (b.bought_at ?? b.updated_at).localeCompare(a.bought_at ?? a.updated_at),
  )
}

export function groupByCategory(items: Item[]): Array<[string, Item[]]> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const category = normalizeCategory(item.category)
    const bucket = groups.get(category)
    if (bucket) bucket.push(item)
    else groups.set(category, [item])
  }
  return [...groups.entries()]
    .map(([category, group]) => [category, sortActive(group)] as [string, Item[]])
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'it'))
}

export function matchesQuery(item: Item, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [item.name, item.category, item.note, item.quantity].some((value) =>
    value?.toLowerCase().includes(needle),
  )
}

export function categoryCounts(items: Item[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const category = normalizeCategory(item.category)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return [...counts.entries()].sort(
    ([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'it'),
  )
}
