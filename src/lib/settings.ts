import { CATEGORIES, DEFAULT_CATEGORY, readCategories } from './categories'
import { defaultPreset, normalizePresets, type OrderPreset } from './order-presets'

export type ThemeId = 'yellow' | 'green'

export interface ThemeOption {
  id: ThemeId
  label: string
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'yellow', label: 'Giallo (predefinito)' },
  { id: 'green', label: 'Verde (secondario)' },
]

const THEME_IDS = new Set<string>(THEME_OPTIONS.map((option) => option.id))

/**
 * Valori usati prima delle palette giallo/verde. `auto` era il verde di
 * sistema, ma il nuovo default è il giallo: chi non aveva scelto un tema
 * esplicito deve trovare la nuova palette predefinita.
 */
const LEGACY_THEMES: Record<string, ThemeId> = {
  auto: 'yellow',
  light: 'green',
  'dark-yellow': 'yellow',
  'light-yellow': 'yellow',
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export function normalizeTheme(value: unknown): ThemeId {
  if (isThemeId(value)) return value
  if (typeof value === 'string' && Object.hasOwn(LEGACY_THEMES, value)) {
    return LEGACY_THEMES[value] ?? 'yellow'
  }
  return 'yellow'
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
  /** Palette della UI; chiaro/scuro segue sempre il tema di sistema. */
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
  theme: 'yellow',
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
    theme: normalizeTheme(settings.theme),
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
      theme: normalizeTheme(parsed.theme),
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
