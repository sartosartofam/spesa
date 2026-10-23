import { CATEGORIES, normalizeCategoryOrder, readCategories } from './categories'

/**
 * Preset del percorso negozio. Per ora vivono in localStorage e sono locali al
 * dispositivo; la sincronizzazione per famiglia arriverà con Supabase.
 */
export interface OrderPreset {
  id: string
  name: string
  /** Ordine delle categorie, sempre completo e con "Altro" in fondo. */
  order: string[]
}

export interface PresetImportResult {
  presets: OrderPreset[]
  warnings: string[]
}

export interface PresetMergeResult {
  presets: OrderPreset[]
  activePresetId: string
  added: number
  updated: number
}

const MAX_NAME_LENGTH = 40
let fallbackId = 0

export function createPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackId += 1
  return `preset-${Date.now()}-${fallbackId}`
}

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const name = value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
  return name || fallback
}

function nameKey(value: string): string {
  return value.toLocaleLowerCase('it')
}

export function uniquePresetName(base: string, presets: readonly OrderPreset[]): string {
  const used = new Set(presets.map((preset) => nameKey(preset.name)))
  if (!used.has(nameKey(base))) return base

  let index = 2
  let candidate = `${base} (${index})`
  while (used.has(nameKey(candidate))) {
    index += 1
    candidate = `${base} (${index})`
  }
  return candidate
}

export function defaultPreset(categories: readonly string[] = readCategories()): OrderPreset {
  return {
    id: 'default',
    name: 'Il mio negozio',
    order: normalizeCategoryOrder(CATEGORIES, categories),
  }
}

export function createPreset(
  name: string,
  order: readonly string[] | undefined,
  categories: readonly string[] = readCategories(),
  id = createPresetId(),
): OrderPreset {
  return {
    id,
    name: cleanName(name, 'Preset'),
    order: normalizeCategoryOrder(order, categories),
  }
}

/**
 * Ripulisce i preset letti da storage o import: id univoci, nomi non vuoti,
 * ordine completo. Se non resta nulla, restituisce il preset predefinito.
 */
export function normalizePresets(
  value: unknown,
  categories: readonly string[] = readCategories(),
): OrderPreset[] {
  const entries = Array.isArray(value) ? value : []
  const presets: OrderPreset[] = []
  const ids = new Set<string>()

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const rawOrder = Array.isArray(record.order)
      ? record.order.filter((value): value is string => typeof value === 'string')
      : []
    if (rawOrder.length === 0) continue

    let id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : createPresetId()
    if (ids.has(id)) id = createPresetId()
    ids.add(id)

    const name = uniquePresetName(cleanName(record.name, `Preset ${presets.length + 1}`), presets)
    presets.push({
      id,
      name,
      order: normalizeCategoryOrder(rawOrder, categories),
    })
  }

  return presets.length > 0 ? presets : [defaultPreset(categories)]
}

function matchCategory(value: string, categories: readonly string[]): string | null {
  const key = value.trim().toLocaleLowerCase('it')
  if (!key) return null
  return categories.find((category) => nameKey(category) === key) ?? null
}

function matchOrder(
  values: readonly string[],
  categories: readonly string[],
): { order: string[]; unknown: string[] } {
  const order: string[] = []
  const unknown: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const category = matchCategory(value, categories)
    if (!category) {
      const raw = value.trim()
      if (raw && !unknown.some((entry) => nameKey(entry) === nameKey(raw))) unknown.push(raw)
      continue
    }
    if (seen.has(category)) continue
    seen.add(category)
    order.push(category)
  }

  return { order, unknown }
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((entry) => entry.some((value) => value.trim().length > 0))
}

function isJsonFile(fileName: string, content: string): boolean {
  const extension = fileName.toLocaleLowerCase('it').split('.').pop()
  if (extension === 'json') return true
  if (extension === 'csv') return false
  return content.trimStart().startsWith('{') || content.trimStart().startsWith('[')
}

function parseJsonPresets(
  content: string,
  fallbackName: string,
  categories: readonly string[],
): PresetImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Il file JSON non è valido.')
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { presets?: unknown }).presets)
      ? ((parsed as { presets: unknown[] }).presets ?? [])
      : [parsed]

  const presets: OrderPreset[] = []
  const warnings: string[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const values = Array.isArray(record.order)
      ? record.order.filter((value): value is string => typeof value === 'string')
      : Array.isArray(record.categories)
        ? record.categories.filter((value): value is string => typeof value === 'string')
        : []

    const matched = matchOrder(values, categories)
    warnings.push(...matched.unknown.map((value) => `Categoria ignorata: ${value}.`))
    if (matched.order.length === 0) continue

    const name = uniquePresetName(
      cleanName(record.name, `${fallbackName} ${presets.length + 1}`),
      presets,
    )
    presets.push({
      id: createPresetId(),
      name,
      order: normalizeCategoryOrder(matched.order, categories),
    })
  }

  if (presets.length === 0) {
    throw new Error('Nessun preset valido trovato nel file JSON.')
  }

  return { presets, warnings }
}

function parseCsvPresets(
  content: string,
  fallbackName: string,
  categories: readonly string[],
): PresetImportResult {
  const normalized = content.replace(/^\uFEFF/, '')
  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows = parseCsvRows(normalized, delimiter)
  if (rows.length === 0) throw new Error('Il file CSV è vuoto.')

  const first = rows[0]?.map((value) => value.trim().toLocaleLowerCase('it')) ?? []
  const isHeader =
    ['preset', 'profilo', 'negozio', 'name', 'nome'].includes(first[0] ?? '') ||
    (first.length === 1 && ['categoria', 'category', 'categorie'].includes(first[0] ?? ''))
  const dataRows = isHeader ? rows.slice(1) : rows
  if (dataRows.length === 0) throw new Error('Il file CSV non contiene categorie.')

  const twoColumns = dataRows.some((row) => (row[1] ?? '').trim().length > 0)
  const grouped = new Map<string, { name: string; order: string[] }>()
  const warnings: string[] = []

  for (const row of dataRows) {
    const presetName = cleanName(
      twoColumns ? row[0] : fallbackName,
      twoColumns ? fallbackName : 'Importato',
    )
    const rawCategory = twoColumns ? (row[1] ?? '') : (row[0] ?? '')
    const category = matchCategory(rawCategory, categories)
    if (!category) {
      const raw = rawCategory.trim()
      if (
        raw &&
        !warnings.some((entry) => nameKey(entry) === nameKey(`Categoria ignorata: ${raw}.`))
      ) {
        warnings.push(`Categoria ignorata: ${raw}.`)
      }
      continue
    }

    const key = nameKey(presetName)
    const group = grouped.get(key)
    if (group) {
      group.order.push(category)
    } else {
      grouped.set(key, { name: presetName, order: [category] })
    }
  }

  const presets: OrderPreset[] = []
  for (const group of grouped.values()) {
    const name = uniquePresetName(group.name, presets)
    presets.push({
      id: createPresetId(),
      name,
      order: normalizeCategoryOrder(group.order, categories),
    })
  }

  if (presets.length === 0) {
    throw new Error('Nessuna categoria riconosciuta nel file CSV.')
  }

  return { presets, warnings }
}

/**
 * Importa preset da JSON o CSV.
 *
 * JSON: `{ "name": "Esselunga", "order": ["Casa", ...] }`,
 *       `{ "presets": [...] }` oppure un array di preset.
 * CSV: due colonne `preset,categoria`; con una sola colonna viene usato il
 *      nome del file come preset.
 */
export function parsePresetImport(
  content: string,
  fileName: string,
  categories: readonly string[] = readCategories(),
): PresetImportResult {
  const fallbackName =
    fileName
      .replace(/\.[^.]+$/, '')
      .trim()
      .slice(0, MAX_NAME_LENGTH) || 'Importato'
  const normalized = content.replace(/^\uFEFF/, '')

  return isJsonFile(fileName, normalized)
    ? parseJsonPresets(normalized, fallbackName, categories)
    : parseCsvPresets(normalized, fallbackName, categories)
}

/**
 * Unisce i preset importati a quelli esistenti: stesso nome = aggiornamento,
 * nome nuovo = aggiunta. Il primo preset importato diventa quello attivo.
 */
export function mergeImportedPresets(
  current: readonly OrderPreset[],
  imported: readonly OrderPreset[],
): PresetMergeResult {
  const presets = current.map((preset) => ({ ...preset, order: [...preset.order] }))
  let activePresetId = ''
  let added = 0
  let updated = 0

  for (const importedPreset of imported) {
    const index = presets.findIndex(
      (preset) => nameKey(preset.name) === nameKey(importedPreset.name),
    )
    if (index >= 0) {
      const existing = presets[index]
      if (!existing) continue
      presets[index] = { ...existing, order: [...importedPreset.order] }
      if (!activePresetId) activePresetId = existing.id
      updated += 1
      continue
    }

    const preset = {
      ...importedPreset,
      id: createPresetId(),
      name: uniquePresetName(importedPreset.name, presets),
      order: [...importedPreset.order],
    }
    presets.push(preset)
    if (!activePresetId) activePresetId = preset.id
    added += 1
  }

  return {
    presets,
    activePresetId: activePresetId || presets[0]?.id || 'default',
    added,
    updated,
  }
}

export function serializePresets(presets: readonly OrderPreset[]): string {
  return JSON.stringify(
    {
      version: 1,
      presets: presets.map((preset) => ({ name: preset.name, order: preset.order })),
    },
    null,
    2,
  )
}
