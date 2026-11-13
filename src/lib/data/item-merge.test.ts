import { describe, expect, it } from 'vitest'
import type { Item } from '../types'
import { identityKey, mergeItem, sortForView } from './item-merge'

function item(overrides: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    family_id: 'famiglia-a',
    category: 'Dispensa',
    status: 'to_buy',
    urgent: false,
    note: null,
    quantity: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    bought_at: null,
    ...overrides,
  }
}

describe('identityKey', () => {
  it('tratta come uguali nome e categoria con spazi e maiuscole diverse', () => {
    const first = identityKey({ status: 'to_buy', name: '  Latte  ', category: 'Freschi' })
    const second = identityKey({ status: 'to_buy', name: 'latte', category: 'freschi' })
    expect(first).toBe(second)
  })

  it('normalizza le categorie vuote su “Altro”', () => {
    expect(identityKey({ status: 'to_buy', name: 'Pane', category: null })).toBe(
      identityKey({ status: 'to_buy', name: 'Pane', category: 'Altro' }),
    )
  })

  it('separa lista attiva e storico', () => {
    expect(identityKey({ status: 'to_buy', name: 'Pane', category: 'Altro' })).not.toBe(
      identityKey({ status: 'bought', name: 'Pane', category: 'Altro' }),
    )
  })

  it('distingue articoli con categorie o nomi diversi', () => {
    const base = identityKey({ status: 'to_buy', name: 'Pane', category: 'Freschi' })
    expect(identityKey({ status: 'to_buy', name: 'Pane', category: 'Dispensa' })).not.toBe(base)
    expect(identityKey({ status: 'to_buy', name: 'Latte', category: 'Freschi' })).not.toBe(base)
  })
})

describe('mergeItem', () => {
  it('somma le quantità compatibili e conserva la nota più informativa', () => {
    const target = item({ id: '1', name: 'Latte', quantity: '2 l' })
    const source = item({
      id: '2',
      name: 'Latte',
      quantity: '1 l',
      note: 'parzialmente scremato',
    })

    const merged = mergeItem(target, source, '2026-02-01T10:00:00.000Z')

    expect(merged.id).toBe('1')
    expect(merged.quantity).toBe('3 l')
    expect(merged.note).toBe('parzialmente scremato')
    expect(merged.updated_at).toBe('2026-02-01T10:00:00.000Z')
  })

  it('tiene la nota del target quando è già valorizzata', () => {
    const merged = mergeItem(
      item({ id: '1', name: 'Latte', note: 'intero' }),
      item({ id: '2', name: 'Latte', note: 'scremato' }),
    )
    expect(merged.note).toBe('intero')
  })

  it('considera la nota fatta di soli spazi come vuota', () => {
    const merged = mergeItem(
      item({ id: '1', name: 'Latte', note: '   ' }),
      item({ id: '2', name: 'Latte', note: 'scremato' }),
    )
    expect(merged.note).toBe('scremato')
  })

  it('somma l’urgenza con OR', () => {
    const merged = mergeItem(
      item({ id: '1', name: 'Latte', urgent: false }),
      item({ id: '2', name: 'Latte', urgent: true }),
    )
    expect(merged.urgent).toBe(true)
  })

  it('non modifica gli articoli di partenza', () => {
    const target = item({ id: '1', name: 'Latte', urgent: false, quantity: '2 l' })
    const source = item({ id: '2', name: 'Latte', urgent: true, quantity: '1 l' })

    mergeItem(target, source)

    expect(target.urgent).toBe(false)
    expect(target.quantity).toBe('2 l')
    expect(source.urgent).toBe(true)
  })
})

describe('sortForView', () => {
  it('nella lista attiva mette gli urgenti in cima e ordina per categoria e nome', () => {
    const items = [
      item({ id: '1', name: 'Zucchine', category: 'Frutta e verdura' }),
      item({ id: '2', name: 'Pane', category: 'Freschi' }),
      item({ id: '3', name: 'Detersivo', category: 'Casa', urgent: true }),
      item({ id: '4', name: 'Mele', category: 'Frutta e verdura' }),
      item({ id: '5', name: 'Caffè', category: 'Dispensa' }),
      item({ id: '6', name: 'Biscotti', category: 'Sconosciuta' }),
    ]

    expect(sortForView(items, 'active').map((entry) => entry.name)).toEqual([
      'Detersivo',
      'Mele',
      'Zucchine',
      'Pane',
      'Caffè',
      'Biscotti',
    ])
  })

  it('esclude dallo storico gli articoli ancora da prendere', () => {
    const items = [
      item({ id: '1', name: 'Pane' }),
      item({
        id: '2',
        name: 'Latte',
        status: 'bought',
        bought_at: '2026-01-02T10:00:00.000Z',
      }),
    ]

    expect(sortForView(items, 'history').map((entry) => entry.name)).toEqual(['Latte'])
    expect(sortForView(items, 'active').map((entry) => entry.name)).toEqual(['Pane'])
  })

  it('ordina lo storico dal più recente, con fallback su updated_at', () => {
    const items = [
      item({
        id: '1',
        name: 'Vecchio',
        status: 'bought',
        bought_at: '2026-01-01T10:00:00.000Z',
      }),
      item({
        id: '2',
        name: 'Senza data acquisto',
        status: 'bought',
        bought_at: null,
        updated_at: '2026-01-03T10:00:00.000Z',
      }),
      item({
        id: '3',
        name: 'Nuovo',
        status: 'bought',
        bought_at: '2026-01-02T10:00:00.000Z',
      }),
    ]

    expect(sortForView(items, 'history').map((entry) => entry.name)).toEqual([
      'Senza data acquisto',
      'Nuovo',
      'Vecchio',
    ])
  })
})
