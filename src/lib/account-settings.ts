import { categoriesFromCustom, normalizeCustomCategories, readCustomCategories } from './categories'
import { isLiveData } from './data'
import type { Json } from './database.types'
import type { OrderPreset } from './order-presets'
import { parseSettings, readSettings, type Settings } from './settings'
import { getSupabase, type SpesaSupabaseClient } from './supabase'

/**
 * Impostazioni dell'account.
 *
 * Il payload è versionato e vive in `public.user_settings.settings` (JSONB).
 * La RLS è self-only: ogni utente legge e scrive solo la propria riga, quindi
 * le impostazioni non sono condivise con la famiglia. Il `localStorage` resta
 * una cache per account e il fallback quando la sincronizzazione non riesce.
 */

export const ACCOUNT_SETTINGS_VERSION = 1

export interface AccountSettingsPayload {
  version: number
  quickAdd: boolean
  defaultCategory: string
  activePresetId: string
  presets: OrderPreset[]
  customCategories: string[]
  landingGlow: boolean
}

export interface AccountSettings {
  settings: Settings
  customCategories: string[]
}

const CACHE_PREFIX = 'spesa.account-settings.v1.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`
}

/** Impostazioni locali "storiche", condivise dal dispositivo prima della sync. */
export function readLocalAccountSettings(): AccountSettings {
  return {
    settings: readSettings(),
    customCategories: readCustomCategories(),
  }
}

/** Interpreta un payload remoto o in cache senza fidarsi della sua forma. */
export function parseAccountSettingsPayload(value: unknown): AccountSettings {
  const record = isRecord(value) ? value : {}
  const customCategories = normalizeCustomCategories(record.customCategories)
  const categories = categoriesFromCustom(customCategories)
  // Le versioni future/vecchie vengono comunque lette in modo tollerante:
  // i campi sconosciuti sono ignorati e quelli mancanti ricadono sui default.
  const settings = parseSettings(record, categories)
  return { settings, customCategories }
}

/** Costruisce il payload versionato da salvare sul database. */
export function toAccountSettingsPayload(
  settings: Settings,
  customCategories: readonly string[],
): AccountSettingsPayload {
  const custom = normalizeCustomCategories(customCategories)
  const categories = categoriesFromCustom(custom)
  const normalized = parseSettings(settings, categories)
  return {
    version: ACCOUNT_SETTINGS_VERSION,
    quickAdd: normalized.quickAdd,
    defaultCategory: normalized.defaultCategory,
    activePresetId: normalized.activePresetId,
    presets: normalized.presets,
    customCategories: custom,
    landingGlow: normalized.landingGlow,
  }
}

/** Serializza le impostazioni nel formato salvato in cache. */
export function serializeAccountSettings(account: AccountSettings): AccountSettingsPayload {
  return toAccountSettingsPayload(account.settings, account.customCategories)
}

/**
 * Cache locale per account. Evita che al cambio utente compaiano le
 * impostazioni dell'utente precedente.
 */
export function readCachedAccountSettings(userId: string): AccountSettings | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    return parseAccountSettingsPayload(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeCachedAccountSettings(userId: string, account: AccountSettings): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(serializeAccountSettings(account)))
  } catch {
    // Storage non disponibile: le impostazioni valgono solo per la sessione.
  }
}

/**
 * Impostazioni locali da mostrare per un account: prima la cache dedicata,
 * poi i dati storici del dispositivo (usati per la migrazione iniziale).
 */
export function localAccountSettings(userId: string): AccountSettings {
  return readCachedAccountSettings(userId) ?? readLocalAccountSettings()
}

/**
 * Il remoto vince quando esiste; il locale serve solo a seminare una riga
 * mancante. Non mescola i dati: le impostazioni di un account non devono
 * finire in quelle di un altro.
 */
export function mergeAccountSettings(
  remote: AccountSettings | null,
  local: AccountSettings,
): AccountSettings {
  return remote ?? local
}

/** Client per la sync, oppure null quando l'app usa i dati mock. */
export function accountSettingsClient(): SpesaSupabaseClient | null {
  if (!isLiveData) return null
  const client = getSupabase()
  if (!client) throw new Error('Supabase non configurato')
  return client
}

/** Legge le impostazioni dell'account. Null se la riga non esiste ancora. */
export async function loadAccountSettings(
  userId: string,
  client: SpesaSupabaseClient | null = accountSettingsClient(),
): Promise<AccountSettings | null> {
  if (!client) return null

  const { data, error } = await client
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return parseAccountSettingsPayload(data.settings)
}

/**
 * Salva le impostazioni dell'account.
 *
 * Update prima e insert solo se la riga non esiste: i grant ammettono
 * `update (settings)` ma non `update (user_id)`, quindi un upsert che ripete
 * `user_id` potrebbe essere rifiutato. Nessuna chiamata in modalità mock.
 */
export async function saveAccountSettings(
  userId: string,
  account: AccountSettings,
  client: SpesaSupabaseClient | null = accountSettingsClient(),
): Promise<void> {
  if (!client) return

  const settings = serializeAccountSettings(account) as unknown as NonNullable<Json>

  const { data, error } = await client
    .from('user_settings')
    .update({ settings })
    .eq('user_id', userId)
    .select('user_id')

  if (error) throw error
  if (data && data.length > 0) return

  const { error: insertError } = await client
    .from('user_settings')
    .insert({ user_id: userId, settings })

  if (insertError) throw insertError
}

/** Messaggio utente per un errore di sync, senza dettagli SQL. */
export function mapAccountSettingsError(error: unknown): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : String(error)

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code: unknown }).code
      : null

  if (/not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (
    code === '42501' ||
    /permission denied|row-level security|non hai i permessi/i.test(message)
  ) {
    return 'Non hai i permessi per sincronizzare le impostazioni.'
  }
  if (/supabase non configurato/i.test(message)) {
    return 'La sincronizzazione delle impostazioni non è configurata.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Le impostazioni restano su questo dispositivo.'
  }
  return 'Non è stato possibile sincronizzare le impostazioni. Restano su questo dispositivo.'
}
