import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../database.types'
import { createSupabaseItemsRepository, toDataError } from './supabase-repository'

type Row = Database['public']['Tables']['items']['Row']

const FAMILY_ID = '00000000-0000-4000-8000-000000000001'
const MEMBER_ID = '00000000-0000-4000-8000-000000000101'

interface FakeApi {
  rows: Row[]
  requests: string[]
  failNext: { code: string; status: number } | null
  rpcError: unknown
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function postgrestError(code: string, status: number): Response {
  return jsonResponse({ code, message: 'errore finto', details: null, hint: null }, status)
}

function applyStatusRules(row: Row, status: Row['status'], now: string): void {
  row.status = status
  if (status === 'bought') {
    row.urgent = false
    row.bought_at = row.bought_at ?? now
  } else {
    row.bought_at = null
  }
}

/**
 * Server PostgREST in memoria: interpreta le query che il repository genera
 * davvero, così i test coprono URL, filtri e ritorno delle righe.
 */
function createFakeApi(seed: Row[] = []): {
  api: FakeApi
  repository: ReturnType<typeof createSupabaseItemsRepository>
} {
  const api: FakeApi = {
    rows: seed.map((row) => ({ ...row })),
    requests: [],
    failNext: null,
    rpcError: null,
  }

  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    )
    const method = (init?.method ?? 'GET').toUpperCase()
    const headers = new Headers(init?.headers)
    const accept = headers.get('accept') ?? ''
    const wantsObject = accept.includes('application/vnd.pgrst.object')
    api.requests.push(`${method} ${url.pathname}${url.search}`)

    if (url.pathname.endsWith('/rpc/current_family_id')) {
      if (api.rpcError) throw api.rpcError
      return jsonResponse(FAMILY_ID)
    }

    if (!url.pathname.endsWith('/rest/v1/items')) {
      return jsonResponse({ message: 'not found' }, 404)
    }

    if (api.failNext) {
      const failure = api.failNext
      api.failNext = null
      return postgrestError(failure.code, failure.status)
    }

    const idFilter = url.searchParams.get('id')
    const statusFilter = url.searchParams.get('status')
    const matches = api.rows.filter((row) => {
      if (idFilter?.startsWith('eq.') && row.id !== idFilter.slice(3)) return false
      if (statusFilter?.startsWith('eq.') && row.status !== statusFilter.slice(3)) return false
      return true
    })

    if (method === 'GET') {
      const select = url.searchParams.get('select') ?? '*'
      const projected =
        select === '*'
          ? matches
          : matches.map((row) =>
              Object.fromEntries(
                select.split(',').map((field) => [field, row[field as keyof Row]]),
              ),
            )
      if (wantsObject) {
        if (projected.length !== 1) return postgrestError('PGRST116', 406)
        return jsonResponse(projected[0])
      }
      return jsonResponse(projected)
    }

    if (method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Partial<Row> | Partial<Row>[]
      const values = Array.isArray(body) ? body : [body]
      const inserted = values.map((value, index) => {
        const now = new Date().toISOString()
        const status = value.status ?? 'to_buy'
        const row: Row = {
          id: value.id ?? `new-item-${api.rows.length + index + 1}`,
          family_id: value.family_id ?? FAMILY_ID,
          name: value.name ?? '',
          category: value.category ?? null,
          status,
          urgent: status === 'bought' ? false : Boolean(value.urgent),
          note: value.note ?? null,
          quantity: value.quantity ?? null,
          created_by: value.created_by ?? MEMBER_ID,
          created_at: value.created_at ?? now,
          updated_at: value.updated_at ?? now,
          bought_at: status === 'bought' ? now : null,
        }
        api.rows.push(row)
        return row
      })
      return jsonResponse(wantsObject ? inserted[0] : inserted, 201)
    }

    if (method === 'PATCH') {
      const patch = JSON.parse(String(init?.body ?? '{}')) as Partial<Row>
      const now = new Date().toISOString()
      const updated: Row[] = []
      for (const row of matches) {
        Object.assign(row, patch)
        if (patch.status !== undefined) applyStatusRules(row, patch.status, now)
        row.updated_at = now
        updated.push(row)
      }
      if (updated.length === 0) return postgrestError('PGRST116', 406)
      return jsonResponse(wantsObject ? updated[0] : updated)
    }

    if (method === 'DELETE') {
      api.rows = api.rows.filter((row) => !matches.includes(row))
      return new Response(null, { status: 204 })
    }

    return jsonResponse({ message: 'method not allowed' }, 405)
  }

  const client = createClient<Database>('http://localhost', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl as typeof fetch },
  })

  return { api, repository: createSupabaseItemsRepository(client) }
}

function makeRow(overrides: Partial<Row> & Pick<Row, 'id' | 'name'>): Row {
  const now = new Date().toISOString()
  return {
    family_id: FAMILY_ID,
    category: 'Dispensa',
    status: 'to_buy',
    urgent: false,
    note: null,
    quantity: null,
    created_by: MEMBER_ID,
    created_at: now,
    updated_at: now,
    bought_at: null,
    ...overrides,
  }
}

describe('supabase items repository', () => {
  it('legge solo lo stato della vista e ordina come il mock', async () => {
    const { repository } = createFakeApi([
      makeRow({
        id: 'bought-1',
        name: 'Caffè',
        status: 'bought',
        bought_at: '2026-10-01T10:00:00.000Z',
      }),
      makeRow({ id: 'active-1', name: 'Pasta', category: 'Dispensa' }),
      makeRow({ id: 'active-2', name: 'Latte', category: 'Freschi' }),
      makeRow({ id: 'active-3', name: 'Detersivo', category: 'Casa', urgent: true }),
    ])

    const active = await repository.list('active')
    const history = await repository.list('history')

    expect(active.map((item) => item.name)).toEqual(['Detersivo', 'Latte', 'Pasta'])
    expect(history.map((item) => item.name)).toEqual(['Caffè'])
  })

  it('inserisce con family_id dall’RPC e normalizza i campi', async () => {
    const { api, repository } = createFakeApi()

    const item = await repository.add({
      name: '  Yogurt  ',
      category: ' Freschi ',
      quantity: ' 2 ',
      note: ' ',
    })

    expect(item.name).toBe('Yogurt')
    expect(item.category).toBe('Freschi')
    expect(item.status).toBe('to_buy')
    expect(item.quantity).toBe('2')
    expect(item.note).toBeNull()
    expect(item.family_id).toBe(FAMILY_ID)
    expect(api.requests).toContain('POST /rest/v1/rpc/current_family_id')
    expect(api.rows).toHaveLength(1)
  })

  it('unisce i duplicati sommando le quantità', async () => {
    const { api, repository } = createFakeApi()

    const first = await repository.add({
      name: 'Fagioli',
      category: 'Dispensa',
      quantity: '2 scatolette',
    })
    const second = await repository.add({
      name: 'fagioli',
      category: 'Dispensa',
      quantity: '3 scatolette',
    })

    expect(second.id).toBe(first.id)
    expect(api.rows).toHaveLength(1)
    expect(api.rows[0]?.quantity).toBe('5 scatolette')
  })

  it('sposta nello storico togliendo l’urgenza', async () => {
    const { repository } = createFakeApi([makeRow({ id: 'urgent-1', name: 'Latte', urgent: true })])

    const bought = await repository.setStatus('urgent-1', 'bought')

    expect(bought.status).toBe('bought')
    expect(bought.urgent).toBe(false)
    expect(bought.bought_at).not.toBeNull()
    expect(await repository.list('active')).toHaveLength(0)
    expect((await repository.list('history')).map((item) => item.id)).toEqual(['urgent-1'])
  })

  it('rimette in lista un articolo preso', async () => {
    const { repository } = createFakeApi([
      makeRow({
        id: 'bought-1',
        name: 'Pane',
        status: 'bought',
        bought_at: '2026-10-01T10:00:00.000Z',
      }),
    ])

    const restored = await repository.setStatus('bought-1', 'to_buy')

    expect(restored.status).toBe('to_buy')
    expect(restored.bought_at).toBeNull()
    expect(await repository.list('active')).toHaveLength(1)
  })

  it('un articolo modificato che duplica un altro viene assorbito', async () => {
    const { api, repository } = createFakeApi()

    const first = await repository.add({
      name: 'Fagioli',
      category: 'Dispensa',
      quantity: '2 confezioni',
    })
    const second = await repository.add({
      name: 'Ceci',
      category: 'Dispensa',
      quantity: '1 confezioni',
    })

    const merged = await repository.update(second.id, { name: 'fagioli' })

    expect(merged.id).toBe(first.id)
    expect(merged.quantity).toBe('3 confezioni')
    expect(api.rows).toHaveLength(1)
    expect(api.rows[0]?.name).toBe('Fagioli')
  })

  it('un articolo in storico reso urgente torna in lista in una sola operazione', async () => {
    const { api, repository } = createFakeApi([
      makeRow({
        id: 'bought-1',
        name: 'Latte',
        status: 'bought',
        bought_at: '2026-10-01T10:00:00.000Z',
        quantity: '1 l',
      }),
    ])

    const updated = await repository.update('bought-1', { urgent: true })

    expect(updated.status).toBe('to_buy')
    expect(updated.urgent).toBe(true)
    expect(updated.bought_at).toBeNull()
    expect(api.rows[0]?.status).toBe('to_buy')
    expect((await repository.list('active')).map((item) => item.id)).toEqual(['bought-1'])
    expect(await repository.list('history')).toHaveLength(0)
  })

  it('un articolo in storico reso urgente si unisce al duplicato attivo senza perdere dati', async () => {
    const { api, repository } = createFakeApi([
      makeRow({ id: 'active-1', name: 'Fagioli', category: 'Dispensa', quantity: '2' }),
      makeRow({
        id: 'bought-1',
        name: 'fagioli',
        category: 'Dispensa',
        quantity: '1',
        note: 'da finire',
        status: 'bought',
        bought_at: '2026-10-01T10:00:00.000Z',
      }),
    ])

    const merged = await repository.update('bought-1', { urgent: true })

    expect(merged.id).toBe('active-1')
    expect(merged.status).toBe('to_buy')
    expect(merged.urgent).toBe(true)
    expect(merged.quantity).toBe('3')
    expect(merged.note).toBe('da finire')
    expect(api.rows).toHaveLength(1)
    expect(api.rows[0]?.id).toBe('active-1')
  })

  it('suggerisce nomi unici ordinati anche tra lista e storico', async () => {
    const { repository } = createFakeApi([
      makeRow({ id: '1', name: 'Pane' }),
      makeRow({ id: '2', name: 'Caffè', status: 'bought', bought_at: new Date().toISOString() }),
      makeRow({ id: '3', name: 'Pane', category: 'Freschi' }),
    ])

    await expect(repository.suggestions()).resolves.toEqual(['Caffè', 'Pane'])
  })

  it('elimina un articolo', async () => {
    const { api, repository } = createFakeApi([makeRow({ id: '1', name: 'Pane' })])

    await repository.remove('1')

    expect(api.rows).toHaveLength(0)
  })

  it('ripristina una riga modificata o eliminata', async () => {
    const { api, repository } = createFakeApi()
    const item = await repository.add({
      name: 'Pane',
      category: 'Freschi',
      quantity: '2 confezioni',
    })

    await repository.update(item.id, { name: 'Pane integrale', quantity: '3 confezioni' })
    await repository.restoreItem(item)

    expect(
      (await repository.list('active')).find((candidate) => candidate.id === item.id),
    ).toMatchObject({
      name: 'Pane',
      quantity: '2 confezioni',
    })

    await repository.remove(item.id)
    const restored = await repository.restoreItem(item)

    expect(restored.id).toBe(item.id)
    expect(api.rows).toHaveLength(1)
    expect(api.rows[0]?.name).toBe('Pane')
  })

  it('mappa i permessi negati in un messaggio chiaro', async () => {
    const { api, repository } = createFakeApi()
    api.failNext = { code: '42501', status: 403 }

    await expect(repository.list('active')).rejects.toThrow(
      'Non hai i permessi per questa operazione.',
    )
  })

  it('mappa un articolo inesistente in un messaggio chiaro', async () => {
    const { repository } = createFakeApi()

    await expect(repository.setStatus('missing', 'bought')).rejects.toThrow(
      'Articolo non trovato: potrebbe essere stato eliminato da un altro membro.',
    )
  })

  it('mappa le violazioni di vincolo senza esporre il messaggio SQL', async () => {
    const { api, repository } = createFakeApi()
    api.failNext = { code: '23514', status: 400 }

    await expect(repository.add({ name: 'Pane' })).rejects.toThrow(
      'I dati non sono validi: controlla nome, quantità e categoria.',
    )
  })

  it('mappa un errore di rete in un invito a riprovare', async () => {
    const { api, repository } = createFakeApi()
    api.rpcError = new TypeError('fetch failed')

    await expect(repository.add({ name: 'Pane' })).rejects.toThrow(
      'Connessione assente: controlla la rete e riprova.',
    )
  })

  it('non espone dettagli SQL per errori sconosciuti', () => {
    const error = toDataError({ code: 'XX000', message: 'relation "secret" does not exist' })

    expect(error.message).toBe('Non è stato possibile completare l’operazione. Riprova.')
    expect(error.message).not.toContain('secret')
  })
})
