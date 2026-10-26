import type { Item, ItemStatus } from './types'

/** Ultima lista letta dal database, disponibile quando la rete non risponde. */
export interface CachedList {
  active: Item[]
  history: Item[]
  suggestions: string[]
  savedAt: string
}

const KEY_PREFIX = 'spesa.list.v1.'

function cacheKey(familyId: string): string {
  return `${KEY_PREFIX}${familyId}`
}

function isItemStatus(value: unknown): value is ItemStatus {
  return value === 'to_buy' || value === 'bought'
}

function isItem(value: unknown): value is Item {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    isItemStatus(item.status) &&
    typeof item.urgent === 'boolean' &&
    typeof item.created_at === 'string'
  )
}

function isCachedList(value: unknown): value is CachedList {
  if (typeof value !== 'object' || value === null) return false
  const cached = value as Record<string, unknown>
  return (
    Array.isArray(cached.active) &&
    cached.active.every(isItem) &&
    Array.isArray(cached.history) &&
    cached.history.every(isItem) &&
    Array.isArray(cached.suggestions) &&
    cached.suggestions.every((suggestion) => typeof suggestion === 'string') &&
    typeof cached.savedAt === 'string'
  )
}

/** Legge la cache della famiglia. Restituisce `null` se manca o è corrotta. */
export function readCachedList(familyId: string | null): CachedList | null {
  if (!familyId) return null

  const key = cacheKey(familyId)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCachedList(parsed)) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage non disponibile.
    }
    return null
  }
}

/** Salva l'ultima lista letta con successo. Non solleva se lo storage è pieno. */
export function writeCachedList(
  familyId: string | null,
  active: Item[],
  history: Item[],
  suggestions: string[],
): void {
  if (!familyId) return

  try {
    const cached: CachedList = {
      active,
      history,
      suggestions,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(cacheKey(familyId), JSON.stringify(cached))
  } catch {
    // Storage pieno o disabilitato: la lista online resta utilizzabile.
  }
}

/** Rimuove tutte le copie locali delle liste, per esempio al logout. */
export function clearListCaches(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(KEY_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Storage non disponibile.
  }
}
