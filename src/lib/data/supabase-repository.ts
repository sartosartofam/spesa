import type { PostgrestError } from '@supabase/supabase-js'
import { normalizeCategory } from '../categories'
import type { Database } from '../database.types'
import type { SpesaSupabaseClient } from '../supabase'
import type { Item, ItemStatus, ListView, NewItem } from '../types'
import { identityKey, mergeItem, sortForView } from './item-merge'
import type { ItemsRepository } from './repository'

/**
 * Implementazione Supabase del contratto `ItemsRepository`.
 *
 * Regole:
 * - la RLS limita già ogni query alla famiglia dell'utente: il client non
 *   filtra per `family_id` in lettura e non può leggere altre famiglie;
 * - in inserimento `family_id` arriva dall'RPC `current_family_id()`, mentre
 *   `created_by` è valorizzato dal database con `auth.uid()`;
 * - il merge dei duplicati resta lato client (vedi `item-merge.ts`), in attesa
 *   di un vincolo/trigger lato database.
 */

type ItemRow = Database['public']['Tables']['items']['Row']

const MESSAGES = {
  permission: 'Non hai i permessi per questa operazione.',
  notFound: 'Articolo non trovato: potrebbe essere stato eliminato da un altro membro.',
  constraint: 'I dati non sono validi: controlla nome, quantità e categoria.',
  duplicate: 'Esiste già un articolo con questi dati.',
  relation: 'La famiglia o il membro collegato non esiste più.',
  session: 'Sessione scaduta: accedi di nuovo.',
  network: 'Connessione assente: controlla la rete e riprova.',
  fallback: 'Non è stato possibile completare l’operazione. Riprova.',
} as const

interface ErrorLike {
  code?: unknown
  message?: unknown
}

function codeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const code = (error as ErrorLike).code
  return typeof code === 'string' && code ? code : null
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = typeof error === 'object' && error !== null ? (error as ErrorLike).message : null
  return typeof message === 'string' && /failed to fetch|fetch failed|networkerror/i.test(message)
}

/** Traduce un errore PostgREST in un messaggio per la UI, senza dettagli SQL. */
export function toDataError(error: unknown): Error {
  if (isNetworkError(error)) return new Error(MESSAGES.network, { cause: error })

  const code = codeOf(error)
  switch (code) {
    case '42501':
      return new Error(MESSAGES.permission, { cause: error })
    case 'PGRST116':
      return new Error(MESSAGES.notFound, { cause: error })
    case '23514':
      return new Error(MESSAGES.constraint, { cause: error })
    case '23505':
      return new Error(MESSAGES.duplicate, { cause: error })
    case '23503':
      return new Error(MESSAGES.relation, { cause: error })
    case 'PGRST301':
      return new Error(MESSAGES.session, { cause: error })
    default:
      return new Error(MESSAGES.fallback, { cause: error })
  }
}

async function run<T>(
  query: PromiseLike<{ data: T; error: PostgrestError | null }>,
): Promise<T | null> {
  let result: { data: T; error: PostgrestError | null }
  try {
    result = await query
  } catch (error) {
    throw toDataError(error)
  }
  if (result.error) throw toDataError(result.error)
  return result.data ?? null
}

async function unwrap<T>(
  query: PromiseLike<{ data: T; error: PostgrestError | null }>,
): Promise<NonNullable<T>> {
  const data = await run(query)
  if (data === null || data === undefined) throw new Error(MESSAGES.fallback)
  return data as NonNullable<T>
}

async function unwrapVoid(
  query: PromiseLike<{ data: unknown; error: PostgrestError | null }>,
): Promise<void> {
  await run(query)
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    family_id: row.family_id,
    name: row.name,
    category: row.category,
    status: row.status,
    urgent: row.urgent,
    note: row.note,
    quantity: row.quantity,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    bought_at: row.bought_at,
  }
}

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Fetch tollerante all'allineamento dei tipi generati tra versioni della CLI. */
function rpcFamilyId(
  client: SpesaSupabaseClient,
): PromiseLike<{ data: string | null; error: PostgrestError | null }> {
  return client.rpc('current_family_id') as unknown as PromiseLike<{
    data: string | null
    error: PostgrestError | null
  }>
}

export function createSupabaseItemsRepository(client: SpesaSupabaseClient): ItemsRepository {
  async function currentFamilyId(): Promise<string> {
    return unwrap(rpcFamilyId(client))
  }

  async function rowsByStatus(status: ItemStatus): Promise<Item[]> {
    const rows = await unwrap(client.from('items').select('*').eq('status', status))
    return rows.map(toItem)
  }

  async function findDuplicate(item: Item, exceptId?: string): Promise<Item | null> {
    const key = identityKey(item)
    const candidates = await rowsByStatus(item.status)
    return (
      candidates.find((candidate) => candidate.id !== exceptId && identityKey(candidate) === key) ??
      null
    )
  }

  /** Unisce `source` dentro `target` sul database e restituisce la riga aggiornata. */
  async function mergeInto(target: Item, source: Item): Promise<Item> {
    const merged = mergeItem(target, source)
    const row = await unwrap(
      client
        .from('items')
        .update({
          quantity: merged.quantity,
          note: merged.note,
          urgent: merged.urgent,
        })
        .eq('id', target.id)
        .select('*')
        .single(),
    )
    return toItem(row)
  }

  async function getById(id: string): Promise<Item> {
    const row = await unwrap(client.from('items').select('*').eq('id', id).single())
    return toItem(row)
  }

  return {
    async list(view: ListView) {
      const status: ItemStatus = view === 'active' ? 'to_buy' : 'bought'
      return sortForView(await rowsByStatus(status), view)
    },

    async add(input: NewItem) {
      const name = input.name.trim()
      if (!name) throw new Error("Il nome dell'articolo è obbligatorio.")

      const candidate: Item = {
        id: crypto.randomUUID(),
        family_id: '',
        name,
        category: normalizeCategory(input.category),
        status: input.status ?? 'to_buy',
        urgent: input.urgent === true,
        note: textOrNull(input.note),
        quantity: textOrNull(input.quantity),
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bought_at: null,
      }

      const duplicate = await findDuplicate(candidate)
      if (duplicate) return mergeInto(duplicate, candidate)

      const familyId = await currentFamilyId()
      const row = await unwrap(
        client
          .from('items')
          .insert({
            family_id: familyId,
            name: candidate.name,
            category: candidate.category,
            status: candidate.status,
            urgent: candidate.urgent,
            note: candidate.note,
            quantity: candidate.quantity,
          })
          .select('*')
          .single(),
      )
      return toItem(row)
    },

    async setStatus(id: string, status: ItemStatus) {
      const current = await getById(id)
      const updated: Item = {
        ...current,
        status,
        urgent: status === 'bought' ? false : current.urgent,
        updated_at: new Date().toISOString(),
        bought_at: status === 'bought' ? (current.bought_at ?? new Date().toISOString()) : null,
      }

      const duplicate = await findDuplicate(updated, id)
      if (duplicate) {
        const merged = await mergeInto(duplicate, updated)
        await unwrapVoid(client.from('items').delete().eq('id', id))
        return merged
      }

      const row = await unwrap(
        client
          .from('items')
          .update({ status, urgent: updated.urgent })
          .eq('id', id)
          .select('*')
          .single(),
      )
      return toItem(row)
    },

    async update(id, patch) {
      const current = await getById(id)
      // Un articolo in storico reso urgente torna in lista: il vincolo
      // `items_urgent_only_active` vieta `urgent = true` su `bought`, quindi
      // stato e urgenza cambiano nella stessa operazione.
      const promoting = current.status === 'bought' && patch.urgent === true
      const updated: Item = {
        ...current,
        name: patch.name?.trim() || current.name,
        category:
          patch.category === undefined ? current.category : normalizeCategory(patch.category),
        note: patch.note === undefined ? current.note : patch.note,
        quantity: patch.quantity === undefined ? current.quantity : patch.quantity,
        urgent: patch.urgent === undefined ? current.urgent : patch.urgent,
        status: promoting ? 'to_buy' : current.status,
        bought_at: promoting ? null : current.bought_at,
        updated_at: new Date().toISOString(),
      }

      const duplicate = await findDuplicate(updated, id)
      if (duplicate) {
        const merged = await mergeInto(duplicate, updated)
        await unwrapVoid(client.from('items').delete().eq('id', id))
        return merged
      }

      const row = await unwrap(
        client
          .from('items')
          .update({
            name: updated.name,
            category: updated.category,
            note: updated.note,
            quantity: updated.quantity,
            urgent: updated.urgent,
            ...(promoting ? { status: 'to_buy' as const } : {}),
          })
          .eq('id', id)
          .select('*')
          .single(),
      )
      return toItem(row)
    },

    async remove(id: string) {
      await unwrapVoid(client.from('items').delete().eq('id', id))
    },

    async suggestions() {
      const rows = await unwrap(client.from('items').select('name'))
      const unique = new Set(rows.map((row) => row.name))
      return [...unique].sort((a, b) => a.localeCompare(b, 'it'))
    },
  }
}
