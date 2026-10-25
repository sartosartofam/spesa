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

type Category = (typeof CATEGORIES)[number]

export const DEFAULT_CATEGORY: Category = 'Dispensa'

const CUSTOM_KEY = 'spesa.categories.v1'
const MAX_LENGTH = 30

export function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Altro'
}

/** Ripulisce un nome di categoria: spazi compatti e lunghezza massima. */
export function cleanCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
}

function isBaseCategory(name: string): boolean {
  const key = name.toLowerCase()
  return CATEGORIES.some((category) => category.toLowerCase() === key)
}

/**
 * Normalizza un elenco di categorie personalizzate: stringhe valide, senza
 * duplicati (case-insensitive) e senza nomi già presenti tra quelle di base.
 * Accetta dati arbitrari perché lo stesso code path legge localStorage e il
 * payload JSON remoto.
 */
export function normalizeCustomCategories(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const custom: string[] = []

  for (const entry of entries) {
    if (typeof entry !== 'string') continue
    const name = cleanCategoryName(entry)
    const key = name.toLowerCase()
    if (!name || seen.has(key) || isBaseCategory(name)) continue
    seen.add(key)
    custom.push(name)
  }

  return custom
}

/** Categorie personalizzate salvate sul dispositivo. */
export function readCustomCategories(): string[] {
  try {
    return normalizeCustomCategories(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]'))
  } catch {
    return []
  }
}

/** Salva le categorie personalizzate sul dispositivo e restituisce quelle normalizzate. */
export function writeCustomCategories(value: unknown): string[] {
  const custom = normalizeCustomCategories(value)
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom))
  } catch {
    // Storage non disponibile: la categoria vale solo in memoria.
  }
  return custom
}

/** Categorie di base, categorie personalizzate, "Altro" in fondo. */
export function categoriesFromCustom(value: unknown): string[] {
  return [
    ...CATEGORIES.filter((category) => category !== 'Altro'),
    ...normalizeCustomCategories(value),
    'Altro',
  ]
}

/** Categorie di base, categorie personalizzate salvate sul dispositivo, "Altro" in fondo. */
export function readCategories(): string[] {
  return categoriesFromCustom(readCustomCategories())
}

/**
 * Aggiunge una categoria personalizzata a un elenco già in memoria e
 * restituisce la lista normalizzata. Non tocca lo storage: la persistenza
 * resta al chiamante (locale o account).
 */
export function appendCustomCategory(current: readonly string[], value: string): string[] {
  return normalizeCustomCategories([...current, value])
}

/** Aggiunge una categoria personalizzata al dispositivo e restituisce la lista aggiornata. */
export function addCustomCategory(value: string): string[] {
  const name = cleanCategoryName(value)
  if (name) {
    const existing = readCategories().some(
      (category) => category.toLowerCase() === name.toLowerCase(),
    )
    if (!existing) writeCustomCategories([...readCustomCategories(), name])
  }
  return readCategories()
}

/**
 * Normalizza l'ordine del percorso negozio: tiene solo categorie esistenti,
 * elimina i duplicati, aggiunge in coda quelle nuove e mette "Altro" in fondo.
 */
export function normalizeCategoryOrder(
  order: readonly string[] | undefined,
  categories: readonly string[] = readCategories(),
): string[] {
  const available = categories.filter((category) => category !== 'Altro')
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const value of order ?? []) {
    if (typeof value !== 'string') continue
    const name = available.find((category) => category === value)
    if (!name || seen.has(name)) continue
    seen.add(name)
    normalized.push(name)
  }

  for (const category of available) {
    if (seen.has(category)) continue
    normalized.push(category)
  }

  normalized.push('Altro')
  return normalized
}

/** Ordine di visualizzazione: percorso negozio, personalizzate, "Altro" in fondo. */
export function categoryRank(category: string, order: readonly string[] = CATEGORIES): number {
  if (category === 'Altro') return 1000
  const index = order.indexOf(category)
  return index === -1 ? 900 : index
}
