import { beforeEach, describe, expect, it } from 'vitest'
import {
  type AccountSettings,
  loadAccountSettings,
  localAccountSettings,
  mapAccountSettingsError,
  mergeAccountSettings,
  parseAccountSettingsPayload,
  readCachedAccountSettings,
  saveAccountSettings,
  serializeAccountSettings,
  toAccountSettingsPayload,
  writeCachedAccountSettings,
} from './account-settings'
import { categoriesFromCustom } from './categories'
import { writeSettings } from './settings'
import type { SpesaSupabaseClient } from './supabase'

const SETTINGS = {
  quickAdd: true,
  defaultCategory: 'Panetteria',
  activePresetId: 'p1',
  presets: [{ id: 'p1', name: 'Esselunga', order: ['Panetteria', 'Casa'] }],
  landingGlow: false,
}

function account(): AccountSettings {
  return parseAccountSettingsPayload(toAccountSettingsPayload(SETTINGS, ['Panetteria']))
}

function fakeLoadClient(result: { data: { settings: unknown } | null; error: unknown }) {
  const calls: unknown[] = []
  const client = {
    from(table: string) {
      calls.push(['from', table])
      return {
        select(columns: string) {
          calls.push(['select', columns])
          return {
            eq(column: string, value: string) {
              calls.push(['eq', column, value])
              return { maybeSingle: async () => result }
            },
          }
        },
      }
    },
  }
  return { client: client as unknown as SpesaSupabaseClient, calls }
}

function fakeSaveClient(results: {
  update: { data: Array<{ user_id: string }>; error: unknown }
  insert: { error: unknown }
}) {
  const calls: unknown[] = []
  const client = {
    from(table: string) {
      calls.push(['from', table])
      return {
        update(values: unknown) {
          calls.push(['update', values])
          return {
            eq: () => ({
              select: async () => results.update,
            }),
          }
        },
        insert(values: unknown) {
          calls.push(['insert', values])
          return Promise.resolve(results.insert)
        },
      }
    },
  }
  return { client: client as unknown as SpesaSupabaseClient, calls }
}

describe('payload impostazioni account', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('costruisce un payload versionato con categorie e preset normalizzati', () => {
    const payload = toAccountSettingsPayload(SETTINGS, ['Panetteria', '  panetteria ', 'Casa', ''])

    expect(payload.version).toBe(1)
    expect(payload.quickAdd).toBe(true)
    expect(payload.landingGlow).toBe(false)
    expect(payload.defaultCategory).toBe('Panetteria')
    expect(payload.customCategories).toEqual(['Panetteria'])
    expect(payload.presets[0]?.order[0]).toBe('Panetteria')
    expect(payload.presets[0]?.order).toContain('Casa')
    expect(payload.presets[0]?.order.at(-1)).toBe('Altro')
  })

  it('interpreta dati parziali senza fidarsi dei tipi', () => {
    const parsed = parseAccountSettingsPayload({
      version: 99,
      quickAdd: 'yes',
      defaultCategory: 'Inesistente',
      activePresetId: 'missing',
      customCategories: ['Panetteria', 42, 'PANETTERIA', 'Dispensa', '   ', 'Casa'],
      presets: [
        { id: 'x', name: 'Mercato', order: ['Panetteria', 'Sconosciuta', 'Casa'] },
        { id: 'x', name: 'Doppione', order: ['Casa'] },
        'non un preset',
      ],
    })

    expect(parsed.settings.quickAdd).toBe(false)
    expect(parsed.settings.defaultCategory).toBe('Dispensa')
    expect(parsed.customCategories).toEqual(['Panetteria'])
    expect(parsed.settings.presets).toHaveLength(2)
    expect(parsed.settings.presets[0]?.order[0]).toBe('Panetteria')
    expect(parsed.settings.presets[0]?.order).not.toContain('Sconosciuta')
    expect(parsed.settings.activePresetId).toBe(parsed.settings.presets[0]?.id)
  })

  it('ricade sui default per payload nulli o non oggetto', () => {
    for (const value of [null, undefined, 'boh', 42, []]) {
      const parsed = parseAccountSettingsPayload(value)
      expect(parsed.settings.quickAdd).toBe(false)
      expect(parsed.settings.defaultCategory).toBe('Dispensa')
      expect(parsed.customCategories).toEqual([])
      expect(parsed.settings.presets).toHaveLength(1)
      expect(parsed.settings.presets[0]?.order.at(-1)).toBe('Altro')
    }
  })

  it('migra il vecchio categoryOrder dentro un preset', () => {
    const parsed = parseAccountSettingsPayload({
      quickAdd: true,
      defaultCategory: 'Casa',
      categoryOrder: ['Casa', 'Dispensa'],
    })

    expect(parsed.settings.quickAdd).toBe(true)
    expect(parsed.settings.presets).toHaveLength(1)
    expect(parsed.settings.presets[0]?.order.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
  })

  it('sopravvive al round-trip serializzazione/parsing', () => {
    const original = account()
    const parsed = parseAccountSettingsPayload(serializeAccountSettings(original))

    expect(parsed.settings.presets[0]?.order).toEqual(original.settings.presets[0]?.order)
    expect(parsed.customCategories).toEqual(['Panetteria'])
    expect(parsed.settings.quickAdd).toBe(true)
    expect(parsed.settings.landingGlow).toBe(false)
    expect(parsed.settings.defaultCategory).toBe('Panetteria')
  })
})

describe('merge e cache locale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('il remoto vince, il locale serve solo a seminare una riga mancante', () => {
    const remote = account()
    const local = parseAccountSettingsPayload({ quickAdd: false, defaultCategory: 'Casa' })

    expect(mergeAccountSettings(remote, local)).toBe(remote)
    expect(mergeAccountSettings(null, local)).toBe(local)
  })

  it('isola la cache per utente', () => {
    const settings = account()
    writeCachedAccountSettings('utente-a', settings)

    expect(readCachedAccountSettings('utente-a')?.settings.quickAdd).toBe(true)
    expect(readCachedAccountSettings('utente-b')).toBeNull()
  })

  it('usa i dati legacy del dispositivo quando manca la cache per account', () => {
    writeSettings({
      quickAdd: true,
      defaultCategory: 'Casa',
      activePresetId: 'default',
      presets: [{ id: 'default', name: 'Il mio negozio', order: ['Casa'] }],
      landingGlow: true,
    })

    expect(localAccountSettings('utente-nuovo').settings.quickAdd).toBe(true)
    expect(localAccountSettings('utente-nuovo').settings.defaultCategory).toBe('Casa')
  })

  it('ignora una cache corrotta', () => {
    localStorage.setItem('spesa.account-settings.v1.utente', '{non-json')
    expect(readCachedAccountSettings('utente')).toBeNull()
  })
})

describe('loadAccountSettings', () => {
  it('legge e normalizza la riga dell’utente', async () => {
    const { client, calls } = fakeLoadClient({
      data: { settings: toAccountSettingsPayload(SETTINGS, ['Panetteria']) },
      error: null,
    })

    const loaded = await loadAccountSettings('utente-a', client)

    expect(loaded?.settings.defaultCategory).toBe('Panetteria')
    expect(loaded?.customCategories).toEqual(['Panetteria'])
    expect(calls).toContainEqual(['eq', 'user_id', 'utente-a'])
  })

  it('restituisce null quando la riga non esiste', async () => {
    const { client } = fakeLoadClient({ data: null, error: null })
    await expect(loadAccountSettings('utente-a', client)).resolves.toBeNull()
  })

  it('propaga l’errore perché l’app mostri il fallback locale', async () => {
    const { client } = fakeLoadClient({
      data: null,
      error: { message: 'Failed to fetch', code: '' },
    })

    await expect(loadAccountSettings('utente-a', client)).rejects.toMatchObject({
      message: 'Failed to fetch',
    })
  })

  it('non chiama la rete in modalità mock', async () => {
    await expect(loadAccountSettings('utente-a', null)).resolves.toBeNull()
    await expect(saveAccountSettings('utente-a', account(), null)).resolves.toBeUndefined()
  })
})

describe('saveAccountSettings', () => {
  it('aggiorna la riga esistente senza reinserire user_id', async () => {
    const { client, calls } = fakeSaveClient({
      update: { data: [{ user_id: 'utente-a' }], error: null },
      insert: { error: null },
    })

    await saveAccountSettings('utente-a', account(), client)

    const update = calls.find(
      (call): call is [string, { settings: { version: number } }] =>
        Array.isArray(call) && call[0] === 'update',
    )
    expect(update?.[1].settings.version).toBe(1)
    expect(calls.some((call) => Array.isArray(call) && call[0] === 'insert')).toBe(false)
  })

  it('inserisce la riga quando l’update non trova nulla', async () => {
    const { client, calls } = fakeSaveClient({
      update: { data: [], error: null },
      insert: { error: null },
    })

    await saveAccountSettings('utente-a', account(), client)

    const insert = calls.find(
      (call): call is [string, { user_id: string; settings: { version: number } }] =>
        Array.isArray(call) && call[0] === 'insert',
    )
    expect(insert?.[1].user_id).toBe('utente-a')
    expect(insert?.[1].settings.version).toBe(1)
  })

  it('propaga l’errore di update e non tenta l’insert', async () => {
    const { client, calls } = fakeSaveClient({
      update: { data: [], error: { message: 'permission denied', code: '42501' } },
      insert: { error: null },
    })

    await expect(saveAccountSettings('utente-a', account(), client)).rejects.toMatchObject({
      code: '42501',
    })
    expect(calls.some((call) => Array.isArray(call) && call[0] === 'insert')).toBe(false)
  })

  it('propaga l’errore di insert', async () => {
    const { client } = fakeSaveClient({
      update: { data: [], error: null },
      insert: { error: { message: 'duplicate key', code: '23505' } },
    })

    await expect(saveAccountSettings('utente-a', account(), client)).rejects.toMatchObject({
      code: '23505',
    })
  })
})

describe('mapAccountSettingsError', () => {
  it('traduce rete, permessi e sessione', () => {
    expect(mapAccountSettingsError(new Error('Failed to fetch'))).toBe(
      'Impossibile contattare il server. Le impostazioni restano su questo dispositivo.',
    )
    expect(mapAccountSettingsError({ code: '42501', message: 'permission denied' })).toBe(
      'Non hai i permessi per sincronizzare le impostazioni.',
    )
    expect(mapAccountSettingsError(new Error('JWT expired'))).toBe(
      'Sessione scaduta. Accedi di nuovo.',
    )
    expect(mapAccountSettingsError(new Error('Supabase non configurato'))).toBe(
      'La sincronizzazione delle impostazioni non è configurata.',
    )
  })

  it('ha un fallback dedicato alla sincronizzazione', () => {
    expect(mapAccountSettingsError(new Error('boom'))).toBe(
      'Non è stato possibile sincronizzare le impostazioni. Restano su questo dispositivo.',
    )
    expect(mapAccountSettingsError('boom')).toBe(
      'Non è stato possibile sincronizzare le impostazioni. Restano su questo dispositivo.',
    )
  })
})

describe('categoriesFromCustom', () => {
  it('mette le personalizzate prima di Altro e ignora i duplicati', () => {
    expect(categoriesFromCustom(['Panetteria', 'panetteria'])).toEqual([
      'Frutta e verdura',
      'Freschi',
      'Dispensa',
      'Surgelati',
      'Bevande',
      'Casa',
      'Panetteria',
      'Altro',
    ])
  })
})
