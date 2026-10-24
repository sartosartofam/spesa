import { CATEGORIES, DEFAULT_CATEGORY, readCategories } from './categories'
import { defaultPreset, normalizePresets, type OrderPreset } from './order-presets'

export interface Settings {
  /** Se attivo, il campo rapido aggiunge subito senza aprire il dialog. */
  quickAdd: boolean
  defaultCategory: string
  /** Preset del percorso negozio attualmente usato. */
  activePresetId: string
  presets: OrderPreset[]
}

const DEFAULT_PRESET: OrderPreset = {
  id: 'default',
  name: 'Il mio negozio',
  order: [...CATEGORIES],
}

export const DEFAULT_SETTINGS: Settings = {
  quickAdd: false,
  defaultCategory: DEFAULT_CATEGORY,
  activePresetId: DEFAULT_PRESET.id,
  presets: [DEFAULT_PRESET],
}

const STORAGE_KEY = 'spesa.settings.v1'

export function createDefaultSettings(): Settings {
  const preset = defaultPreset(readCategories())
  return {
    ...DEFAULT_SETTINGS,
    activePresetId: preset.id,
    presets: [preset],
  }
}

export function activePreset(settings: Settings): OrderPreset {
  return (
    settings.presets.find((preset) => preset.id === settings.activePresetId) ??
    settings.presets[0] ??
    DEFAULT_PRESET
  )
}

export function activeCategoryOrder(settings: Settings): string[] {
  return activePreset(settings).order
}

export function normalizeSettings(
  settings: Settings,
  categories: readonly string[] = readCategories(),
): Settings {
  const presets = normalizePresets(settings.presets, categories)
  const activePresetId = presets.some((preset) => preset.id === settings.activePresetId)
    ? settings.activePresetId
    : (presets[0]?.id ?? 'default')

  return {
    ...settings,
    activePresetId,
    presets,
  }
}

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultSettings()

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const categories = readCategories()
    let presets: OrderPreset[]

    if (Array.isArray(parsed.presets)) {
      presets = normalizePresets(parsed.presets, categories)
    } else if (Array.isArray(parsed.categoryOrder)) {
      // Migrazione dal formato precedente, con un solo ordine globale.
      const order = parsed.categoryOrder.filter(
        (value): value is string => typeof value === 'string',
      )
      presets = normalizePresets([{ id: 'default', name: 'Il mio negozio', order }], categories)
    } else {
      presets = normalizePresets([], categories)
    }

    const activePresetId =
      typeof parsed.activePresetId === 'string' &&
      presets.some((preset) => preset.id === parsed.activePresetId)
        ? parsed.activePresetId
        : (presets[0]?.id ?? 'default')

    return normalizeSettings(
      {
        quickAdd: parsed.quickAdd === true,
        defaultCategory:
          typeof parsed.defaultCategory === 'string' && categories.includes(parsed.defaultCategory)
            ? parsed.defaultCategory
            : DEFAULT_CATEGORY,
        activePresetId,
        presets,
      },
      categories,
    )
  } catch {
    return createDefaultSettings()
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage non disponibile: le impostazioni valgono solo per la sessione.
  }
}
