import { CATEGORIES, DEFAULT_CATEGORY, readCategories } from './categories'
import { defaultPreset, normalizePresets, type OrderPreset } from './order-presets'

export type ThemeId = 'auto' | 'light' | 'dark-yellow' | 'light-yellow'

export interface ThemeOption {
  id: ThemeId
  label: string
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'auto', label: 'Sistema' },
  { id: 'light', label: 'Chiaro' },
  { id: 'dark-yellow', label: 'Scuro giallo' },
  { id: 'light-yellow', label: 'Chiaro giallo' },
]

const THEME_IDS = new Set<string>(THEME_OPTIONS.map((option) => option.id))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export interface Settings {
  /** Se attivo, il campo rapido aggiunge subito senza aprire il dialog. */
  quickAdd: boolean
  defaultCategory: string
  /** Preset del percorso negozio attualmente usato. */
  activePresetId: string
  presets: OrderPreset[]
  /** Effetto luminoso che segue il cursore sulla landing. */
  landingGlow: boolean
  /** Tema della UI: automatico oppure una palette esplicita. */
  theme: ThemeId
}

const DEFAULT_PRESET: OrderPreset = {
  id: 'default',
  name: 'Il mio negozio',
  order: [...CATEGORIES],
}

const DEFAULT_SETTINGS: Settings = {
  quickAdd: false,
  defaultCategory: DEFAULT_CATEGORY,
  activePresetId: DEFAULT_PRESET.id,
  presets: [DEFAULT_PRESET],
  landingGlow: true,
  theme: 'auto',
}

const STORAGE_KEY = 'spesa.settings.v1'

export function createDefaultSettings(categories: readonly string[] = readCategories()): Settings {
  const preset = defaultPreset(categories)
  return {
    ...DEFAULT_SETTINGS,
    activePresetId: preset.id,
    presets: [preset],
  }
}

function activePreset(settings: Settings): OrderPreset {
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
    theme: isThemeId(settings.theme) ? settings.theme : 'auto',
    activePresetId,
    presets,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Interpreta un payload di impostazioni (locale o remoto) in modo tollerante:
 * campi mancanti o non validi ricadono sui default, i preset vengono normalizzati
 * sulle categorie disponibili e il vecchio `categoryOrder` viene migrato.
 */
export function parseSettings(
  value: unknown,
  categories: readonly string[] = readCategories(),
): Settings {
  const parsed = isRecord(value) ? value : {}
  let presets: OrderPreset[]

  if (Array.isArray(parsed.presets)) {
    presets = normalizePresets(parsed.presets, categories)
  } else if (Array.isArray(parsed.categoryOrder)) {
    // Migrazione dal formato precedente, con un solo ordine globale.
    const order = parsed.categoryOrder.filter((entry): entry is string => typeof entry === 'string')
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
      // Il default è attivo; solo un `false` esplicito lo disattiva.
      landingGlow: parsed.landingGlow !== false,
      theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
    },
    categories,
  )
}

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultSettings()

    return parseSettings(JSON.parse(raw), readCategories())
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
