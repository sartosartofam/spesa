import { CATEGORIES, DEFAULT_CATEGORY, normalizeCategoryOrder, readCategories } from './categories'

export interface Settings {
  /** Se attivo, il campo rapido aggiunge subito senza aprire il dialog. */
  quickAdd: boolean
  defaultCategory: string
  /** Ordine delle categorie nel percorso del negozio. */
  categoryOrder: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  quickAdd: false,
  defaultCategory: DEFAULT_CATEGORY,
  categoryOrder: [...CATEGORIES],
}

const STORAGE_KEY = 'spesa.settings.v1'

function defaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    categoryOrder: normalizeCategoryOrder(DEFAULT_SETTINGS.categoryOrder, readCategories()),
  }
}

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<Settings>
    const categories = readCategories()
    const savedOrder = Array.isArray(parsed.categoryOrder)
      ? parsed.categoryOrder.filter((value): value is string => typeof value === 'string')
      : undefined
    return {
      quickAdd: parsed.quickAdd === true,
      defaultCategory:
        typeof parsed.defaultCategory === 'string' && categories.includes(parsed.defaultCategory)
          ? parsed.defaultCategory
          : DEFAULT_CATEGORY,
      categoryOrder: normalizeCategoryOrder(savedOrder, categories),
    }
  } catch {
    return defaultSettings()
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage non disponibile: le impostazioni valgono solo per la sessione.
  }
}
