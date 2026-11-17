import { describe, expect, it } from 'vitest'
import {
  ADMIN_COUNT_KEYS,
  checkIsAdmin,
  describePingAge,
  fetchAdminOverview,
  formatAdminTimestamp,
  mapAdminError,
  parseAdminOverview,
} from './admin'
import type { SpesaSupabaseClient } from './supabase'

const OVERVIEW = {
  generatedAt: '2026-11-17T13:49:39Z',
  lastMigration: '20261117090000',
  keepaliveLastPing: '2026-11-17T13:45:55Z',
  counts: {
    families: 1,
    members: 2,
    itemsToBuy: 5,
    itemsBought: 2,
    pushSubscriptions: 0,
    invitesActive: 0,
    invitesUsed: 0,
    invitesExpired: 0,
    rateLimits: 0,
  },
}

interface RpcCall {
  name: string
}

/** Client minimo: registra le RPC chiamate e restituisce la risposta indicata. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: RpcCall[] = []
  const client = {
    rpc(name: string) {
      calls.push({ name })
      return Promise.resolve(result)
    },
  }
  return { client: client as unknown as SpesaSupabaseClient, calls }
}

describe('parseAdminOverview', () => {
  it('legge il payload completo di admin_overview()', () => {
    expect(parseAdminOverview(OVERVIEW)).toEqual(OVERVIEW)
  })

  it('accetta numeri come stringa', () => {
    const parsed = parseAdminOverview({
      ...OVERVIEW,
      counts: { ...OVERVIEW.counts, families: '3', members: ' 2 ' },
    })

    expect(parsed?.counts.families).toBe(3)
    expect(parsed?.counts.members).toBe(2)
  })

  it('lascia vuoti i campi mancanti invece di inventare zeri', () => {
    const parsed = parseAdminOverview({ counts: { families: 1 } })

    expect(parsed).not.toBeNull()
    expect(parsed?.counts.families).toBe(1)
    for (const key of ADMIN_COUNT_KEYS) {
      if (key === 'families') continue
      expect(parsed?.counts[key]).toBeNull()
    }
    expect(parsed?.generatedAt).toBeNull()
    expect(parsed?.lastMigration).toBeNull()
    expect(parsed?.keepaliveLastPing).toBeNull()
  })

  it('scarta conteggi non numerici o negativi', () => {
    const parsed = parseAdminOverview({
      counts: { families: 'molte', members: -2, itemsToBuy: 1.5, itemsBought: null, rateLimits: 4 },
    })

    expect(parsed?.counts.families).toBeNull()
    expect(parsed?.counts.members).toBeNull()
    expect(parsed?.counts.itemsToBuy).toBeNull()
    expect(parsed?.counts.itemsBought).toBeNull()
    expect(parsed?.counts.rateLimits).toBe(4)
  })

  it('restituisce null senza la struttura minima', () => {
    expect(parseAdminOverview(null)).toBeNull()
    expect(parseAdminOverview('{}')).toBeNull()
    expect(parseAdminOverview([])).toBeNull()
    expect(parseAdminOverview({})).toBeNull()
    expect(parseAdminOverview({ counts: 'uno' })).toBeNull()
    expect(parseAdminOverview({ counts: [] })).toBeNull()
  })
})

describe('checkIsAdmin', () => {
  it('chiede solo is_admin() e legge il booleano', async () => {
    const { client, calls } = fakeClient({ data: true, error: null })
    expect(await checkIsAdmin(client)).toBe(true)
    expect(calls).toEqual([{ name: 'is_admin' }])
  })

  it('risponde false quando la RPC non conferma o manca il client', async () => {
    const { client } = fakeClient({ data: null, error: null })
    expect(await checkIsAdmin(client)).toBe(false)
    expect(await checkIsAdmin(null)).toBe(false)
  })

  it('propaga l’errore della RPC', async () => {
    const { client } = fakeClient({ data: null, error: { code: '42501', message: 'denied' } })
    await expect(checkIsAdmin(client)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('fetchAdminOverview', () => {
  it('legge gli aggregati dalla RPC', async () => {
    const { client, calls } = fakeClient({ data: OVERVIEW, error: null })
    expect(await fetchAdminOverview(client)).toEqual(OVERVIEW)
    expect(calls).toEqual([{ name: 'admin_overview' }])
  })

  it('rifiuta una risposta inattesa', async () => {
    const { client } = fakeClient({ data: { qualcosa: true }, error: null })
    await expect(fetchAdminOverview(client)).rejects.toThrow(/Risposta del pannello non valida/)
  })

  it('spiega che in demo non c’è nessun backend', async () => {
    await expect(fetchAdminOverview(null)).rejects.toThrow(/backend Supabase/)
  })

  it('propaga il 42501 di chi non è admin', async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: '42501', message: 'permission denied for function admin_overview' },
    })
    await expect(fetchAdminOverview(client)).rejects.toMatchObject({ code: '42501' })
  })
})

describe('describePingAge', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  const back = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it('gestisce l’assenza di ping', () => {
    expect(describePingAge(null, now)).toBe('Nessun ping registrato.')
    expect(describePingAge('non-una-data', now)).toBe('Nessun ping registrato.')
  })

  it('sotto l’ora non dà dettagli', () => {
    expect(describePingAge(back(5 * 60 * 1000), now)).toBe('Meno di un’ora fa.')
  })

  it('conta le ore fino a un giorno', () => {
    expect(describePingAge(back(60 * 60 * 1000), now)).toBe('1 ora fa.')
    expect(describePingAge(back(3 * 60 * 60 * 1000), now)).toBe('3 ore fa.')
    expect(describePingAge(back(23 * 60 * 60 * 1000), now)).toBe('23 ore fa.')
  })

  it('conta i giorni oltre le 24 ore', () => {
    expect(describePingAge(back(24 * 60 * 60 * 1000), now)).toBe('1 giorno fa.')
    expect(describePingAge(back(12 * 24 * 60 * 60 * 1000), now)).toBe('12 giorni fa.')
  })

  it('non grida se l’orologio va all’indietro', () => {
    expect(describePingAge(new Date(now.getTime() + 60_000).toISOString(), now)).toBe(
      'Meno di un’ora fa.',
    )
  })
})

describe('formatAdminTimestamp', () => {
  it('mostra data e ora italiane', () => {
    expect(formatAdminTimestamp('2026-11-17T13:49:39Z')).toMatch(
      /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/,
    )
  })

  it('ha un fallback quando il dato manca o non è valido', () => {
    expect(formatAdminTimestamp(null)).toBe('Non disponibile')
    expect(formatAdminTimestamp('non-una-data')).toBe('Non disponibile')
  })
})

describe('mapAdminError', () => {
  it('riconosce il diniego della RPC', () => {
    expect(mapAdminError({ code: '42501', message: 'permission denied' })).toBe(
      'Questa sezione è riservata all’admin.',
    )
    expect(mapAdminError(new Error('admin_overview è riservato all’admin'))).toBe(
      'Questa sezione è riservata all’admin.',
    )
  })

  it('riconosce la sessione scaduta', () => {
    expect(mapAdminError({ code: 'PGRST301' })).toBe('Sessione scaduta. Accedi di nuovo.')
    expect(mapAdminError(new Error('not authenticated'))).toBe('Sessione scaduta. Accedi di nuovo.')
  })

  it('spiega quando l’ambiente non è configurato', () => {
    expect(mapAdminError(new Error('Supabase non configurato'))).toBe(
      'Il pannello è disponibile solo con il backend Supabase configurato.',
    )
    expect(
      mapAdminError(new Error('Pannello admin non configurato: richiede il backend Supabase.')),
    ).toBe('Il pannello è disponibile solo con il backend Supabase configurato.')
  })

  it('riconosce la rete assente', () => {
    expect(mapAdminError(new TypeError('Failed to fetch'))).toBe(
      'Connessione assente: controlla la rete e riprova.',
    )
    expect(mapAdminError({ message: 'load failed' })).toBe(
      'Connessione assente: controlla la rete e riprova.',
    )
  })

  it('non espone codici o dettagli con gli errori sconosciuti', () => {
    const message = mapAdminError({ code: 'XX000', message: 'errore interno del database' })
    expect(message).toBe('Non è stato possibile leggere lo stato del progetto. Riprova.')
    expect(message).not.toContain('XX000')
  })
})
