import { describe, expect, it } from 'vitest'
import { type ListSnapshot, snapshotOperations } from './history'
import type { Item } from './types'

function item(overrides: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    family_id: 'family-1',
    category: 'Dispensa',
    status: 'to_buy',
    urgent: false,
    note: null,
    quantity: null,
    created_by: 'member-1',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T10:00:00.000Z',
    bought_at: null,
    ...overrides,
  }
}

function snapshot(active: Item[], history: Item[] = []): ListSnapshot {
  return { active, history }
}

describe('snapshotOperations', () => {
  it('rimuove gli articoli creati dall’azione quando si annulla', () => {
    const before = snapshot([item({ id: '1', name: 'Pane' })])
    const after = snapshot([item({ id: '1', name: 'Pane' }), item({ id: '2', name: 'Latte' })])

    expect(snapshotOperations(before, after)).toEqual([{ type: 'remove', id: '2' }])
  })

  it('ripristina gli articoli eliminati dall’azione', () => {
    const before = snapshot([item({ id: '1', name: 'Pane' }), item({ id: '2', name: 'Latte' })])
    const after = snapshot([item({ id: '1', name: 'Pane' })])

    expect(snapshotOperations(before, after)).toEqual([
      { type: 'restore', item: item({ id: '2', name: 'Latte' }) },
    ])
  })

  it('ripristina un articolo cambiato, anche tra lista e storico', () => {
    const before = snapshot(
      [item({ id: '1', name: 'Pane' })],
      [
        item({
          id: '2',
          name: 'Latte',
          status: 'bought',
          bought_at: '2026-10-02T10:00:00.000Z',
        }),
      ],
    )
    const after = snapshot(
      [],
      [
        item({
          id: '2',
          name: 'Latte',
          status: 'bought',
          bought_at: '2026-10-02T10:00:00.000Z',
        }),
      ],
    )

    expect(snapshotOperations(before, after)).toEqual([
      { type: 'restore', item: item({ id: '1', name: 'Pane' }) },
    ])
  })

  it('ignora le differenze dei soli timestamp', () => {
    const before = snapshot([item({ id: '1', name: 'Pane' })])
    const after = snapshot([
      item({
        id: '1',
        name: 'Pane',
        updated_at: '2026-10-03T10:00:00.000Z',
      }),
    ])

    expect(snapshotOperations(before, after)).toEqual([])
  })

  it('riassorbe una riga nel redo quando l’azione aveva fatto un merge', () => {
    const before = snapshot([
      item({ id: '1', name: 'Fagioli', quantity: '2' }),
      item({ id: '2', name: 'Ceci', quantity: '1' }),
    ])
    const after = snapshot([item({ id: '1', name: 'Fagioli', quantity: '3' })])

    expect(snapshotOperations(after, before)).toEqual([
      { type: 'remove', id: '2' },
      { type: 'restore', item: item({ id: '1', name: 'Fagioli', quantity: '3' }) },
    ])
  })
})
