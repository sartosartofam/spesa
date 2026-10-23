import { DEFAULT_CATEGORY, readCategories } from './categories'

export interface Settings {
  /** Se attivo, il campo rapido aggiunge subito senza aprire il dialog. */
  quickAdd: boolean
  defaultCategory: string
}

export const DEFAULT_SETTINGS: Settings = {
  quickAdd: false,
  defaultCategory: DEFAULT_CATEGORY,
}

const STORAGE_KEY = 'spesa.settings.v1'

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    const categories = readCategories()
    return {
      quickAdd: parsed.quickAdd === true,
      defaultCategory:
        typeof parsed.defaultCategory === 'string' && categories.includes(parsed.defaultCategory)
          ? parsed.defaultCategory
          : DEFAULT_CATEGORY,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage non disponibile: le impostazioni valgono solo per la sessione.
  }
}
