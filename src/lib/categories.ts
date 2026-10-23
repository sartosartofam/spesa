/**
 * Categorie condivise da UI e dati.
 *
 * Lo schema le salva come testo libero: questa lista è il contratto della UI
 * finché non arriverà una normalizzazione lato database. Le categorie create
 * dall'utente restano in localStorage e vengono aggiunte in coda, prima di
 * "Altro".
 */

export const CATEGORIES = [
  'Frutta e verdura',
  'Freschi',
  'Dispensa',
  'Surgelati',
  'Bevande',
  'Casa',
  'Altro',
] as const

export type Category = (typeof CATEGORIES)[number]

export const DEFAULT_CATEGORY: Category = 'Dispensa'

const CUSTOM_KEY = 'spesa.categories.v1'
const MAX_LENGTH = 30

export function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Altro'
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
}

function readCustomCategories(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const custom: string[] = []
    for (const value of parsed) {
      if (typeof value !== 'string') continue
      const name = clean(value)
      const key = name.toLowerCase()
      if (!name || seen.has(key)) continue
      if (CATEGORIES.some((category) => category.toLowerCase() === key)) continue
      seen.add(key)
      custom.push(name)
    }
    return custom
  } catch {
    return []
  }
}

/** Categorie di base, categorie personalizzate, "Altro" in fondo. */
export function readCategories(): string[] {
  return [
    ...CATEGORIES.filter((category) => category !== 'Altro'),
    ...readCustomCategories(),
    'Altro',
  ]
}

/** Aggiunge una categoria personalizzata e restituisce la lista aggiornata. */
export function addCustomCategory(value: string): string[] {
  const name = clean(value)
  if (name) {
    const existing = readCategories().some(
      (category) => category.toLowerCase() === name.toLowerCase(),
    )
    if (!existing) {
      const custom = [...readCustomCategories(), name]
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom))
      } catch {
        // Storage non disponibile: la categoria vale solo in memoria.
      }
    }
  }
  return readCategories()
}

/** Ordine di visualizzazione: base, personalizzate, "Altro" in fondo. */
export function categoryRank(category: string): number {
  if (category === 'Altro') return 1000
  const index = CATEGORIES.indexOf(category as Category)
  return index === -1 ? 900 : index
}
