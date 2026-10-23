import { type Category, DEFAULT_CATEGORY } from './categories'

export interface Settings {
  /** Se attivo, il campo rapido aggiunge subito senza aprire il dialog. */
  quickAdd: boolean
  defaultCategory: Category
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
    return {
      quickAdd: parsed.quickAdd === true,
      defaultCategory: parsed.defaultCategory ?? DEFAULT_CATEGORY,
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
