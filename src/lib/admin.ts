import { isLiveData } from './data'
import { getSupabase, type SpesaSupabaseClient } from './supabase'

/**
 * Livello dati del pannello admin (fetta 1, sola lettura).
 *
 * Il client non legge nessuna tabella: esistenza e aggregati arrivano solo
 * dalle RPC `is_admin()` e `admin_overview()`, entrambe `security definer`.
 * `public.admins` non ha policy né grant per i ruoli API, quindi la UI non
 * può — e non deve — chiedere "chi è admin": chiede solo "sono admin io?".
 */

export interface AdminCounts {
  families: number | null
  members: number | null
  itemsToBuy: number | null
  itemsBought: number | null
  pushSubscriptions: number | null
  invitesActive: number | null
  invitesUsed: number | null
  invitesExpired: number | null
  rateLimits: number | null
}

export interface AdminOverview {
  generatedAt: string | null
  lastMigration: string | null
  keepaliveLastPing: string | null
  counts: AdminCounts
}

/** Chiavi numeriche di `counts`, nell'ordine in cui la UI le mostra. */
export const ADMIN_COUNT_KEYS = [
  'families',
  'members',
  'itemsToBuy',
  'itemsBought',
  'pushSubscriptions',
  'invitesActive',
  'invitesUsed',
  'invitesExpired',
  'rateLimits',
] as const satisfies readonly (keyof AdminCounts)[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Un conteggio è un numero intero non negativo, oppure `null`.
 *
 * Arriva dal JSONB della RPC, quindi può essere numero o stringa numerica.
 * Qualunque altra forma diventa `null`: meglio una cella vuota che un numero
 * inventato.
 */
function parseCount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

function parseText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Interpreta il payload di `admin_overview()` senza fidarsi della sua forma.
 *
 * Restituisce `null` quando manca la struttura minima (un oggetto con
 * `counts`): un payload inatteso è un errore, non una schermata di zeri.
 */
export function parseAdminOverview(value: unknown): AdminOverview | null {
  if (!isRecord(value)) return null

  const countsValue = value.counts
  if (!isRecord(countsValue)) return null

  const counts = {} as AdminCounts
  for (const key of ADMIN_COUNT_KEYS) {
    counts[key] = parseCount(countsValue[key])
  }

  return {
    generatedAt: parseText(value.generatedAt),
    lastMigration: parseText(value.lastMigration),
    keepaliveLastPing: parseText(value.keepaliveLastPing),
    counts,
  }
}

/**
 * Client per le RPC admin, oppure `null` in modalità mock/demo.
 *
 * Come per le impostazioni dell'account: in demo non c'è backend e le funzioni
 * restano innocue, mentre un ambiente Supabase configurato male è un errore
 * esplicito e non un pannello vuoto.
 */
function adminClient(): SpesaSupabaseClient | null {
  if (!isLiveData) return null
  const client = getSupabase()
  if (!client) throw new Error('Supabase non configurato')
  return client
}

/** True se l'utente corrente è admin. In demo/mock risponde sempre `false`. */
export async function checkIsAdmin(
  client: SpesaSupabaseClient | null = adminClient(),
): Promise<boolean> {
  if (!client) return false

  const { data, error } = await client.rpc('is_admin')
  if (error) throw error
  return data === true
}

/**
 * Legge gli aggregati del pannello. Chi non è admin riceve `42501` dalla RPC:
 * l'errore risale al chiamante, che lo traduce con `mapAdminError()`.
 */
export async function fetchAdminOverview(
  client: SpesaSupabaseClient | null = adminClient(),
): Promise<AdminOverview> {
  if (!client) throw new Error('Pannello admin non configurato: richiede il backend Supabase.')

  const { data, error } = await client.rpc('admin_overview')
  if (error) throw error

  const overview = parseAdminOverview(data)
  if (!overview) throw new Error('Risposta del pannello non valida.')
  return overview
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Età leggibile dell'ultimo ping keepalive, in italiano.
 *
 * Sotto l'ora non serve più precisione: la domanda è "il ping funziona?".
 */
export function describePingAge(iso: string | null, now: Date = new Date()): string {
  const time = iso ? new Date(iso).getTime() : Number.NaN
  if (Number.isNaN(time)) return 'Nessun ping registrato.'

  const elapsed = now.getTime() - time
  // Un orario nel futuro è quasi sempre uno scarto di clock: non lo gridiamo.
  if (elapsed < HOUR_MS) return 'Meno di un’ora fa.'

  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS)
    return hours === 1 ? '1 ora fa.' : `${hours} ore fa.`
  }

  const days = Math.floor(elapsed / DAY_MS)
  return days === 1 ? '1 giorno fa.' : `${days} giorni fa.`
}

/** Data e ora italiane di un timestamp ISO, oppure "Non disponibile". */
export function formatAdminTimestamp(iso: string | null): string {
  const time = iso ? new Date(iso).getTime() : Number.NaN
  if (Number.isNaN(time)) return 'Non disponibile'

  return new Date(time).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return String(error)
}

function errorCode(error: unknown): string | null {
  if (!isRecord(error)) return null
  const code = error.code
  return typeof code === 'string' && code ? code : null
}

/**
 * Messaggio utente per un errore del pannello: niente codici SQL né dettagli
 * tecnici, come per le azioni sulla lista (`toDataError()`).
 */
export function mapAdminError(error: unknown): string {
  if (error instanceof TypeError) return 'Connessione assente: controlla la rete e riprova.'

  const message = errorMessage(error)
  const code = errorCode(error)

  if (code === '42501' || /riservato all.admin|not an admin/i.test(message)) {
    return 'Questa sezione è riservata all’admin.'
  }
  if (code === 'PGRST301' || /not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (/supabase non configurato|non è configurato|richiede il backend/i.test(message)) {
    return 'Il pannello è disponibile solo con il backend Supabase configurato.'
  }
  if (/failed to fetch|fetch failed|load failed|networkerror|network|offline/i.test(message)) {
    return 'Connessione assente: controlla la rete e riprova.'
  }
  return 'Non è stato possibile leggere lo stato del progetto. Riprova.'
}
