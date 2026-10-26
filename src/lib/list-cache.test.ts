import { beforeEach, describe, expect, it } from 'vitest'
import { clearListCaches, readCachedList, writeCachedList } from './list-cache'
import type { Item, ItemStatus } from './types'

function item(id: string, status: ItemStatus): Item {
  return {
    id,
    family_id: 'famiglia-a',
    name: `Articolo ${id}`,
    category: 'Altro',
    status,
    urgent: false,
    note: null,
    quantity: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    bought_at: status === 'bought' ? '2026-01-01T00:00:00.000Z' : null,
  }
}

describe('cache della lista', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('salva e rilegge la lista per famiglia', () => {
    writeCachedList('famiglia-a', [item('1', 'to_buy')], [item('2', 'bought')], ['Latte'])

    const cached = readCachedList('famiglia-a')

    expect(cached?.active.map((entry) => entry.id)).toEqual(['1'])
    expect(cached?.history.map((entry) => entry.id)).toEqual(['2'])
    expect(cached?.suggestions).toEqual(['Latte'])
    expect(cached?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('non mescola famiglie diverse', () => {
    writeCachedList('famiglia-a', [item('1', 'to_buy')], [], [])

    expect(readCachedList('famiglia-b')).toBeNull()
  })

  it('ignora una cache corrotta e la rimuove', () => {
    localStorage.setItem('spesa.list.v1.famiglia-a', '{non-json')

    expect(readCachedList('famiglia-a')).toBeNull()
    expect(localStorage.getItem('spesa.list.v1.famiglia-a')).toBeNull()
  })

  it('rifiuta dati con una forma inattesa', () => {
    localStorage.setItem(
      'spesa.list.v1.famiglia-a',
      JSON.stringify({ active: [{ id: '1' }], history: [], suggestions: [], savedAt: 'x' }),
    )

    expect(readCachedList('famiglia-a')).toBeNull()
  })

  it('cancella tutte le liste senza toccare le altre chiavi', () => {
    writeCachedList('famiglia-a', [], [], [])
    writeCachedList('famiglia-b', [], [], [])
    localStorage.setItem('spesa.theme.v1', 'green')

    clearListCaches()

    expect(readCachedList('famiglia-a')).toBeNull()
    expect(readCachedList('famiglia-b')).toBeNull()
    expect(localStorage.getItem('spesa.theme.v1')).toBe('green')
  })

  it('non fa nulla senza una famiglia', () => {
    writeCachedList(null, [], [], [])

    expect(Object.keys(localStorage).filter((key) => key.startsWith('spesa.list'))).toEqual([])
    expect(readCachedList(null)).toBeNull()
  })
})
