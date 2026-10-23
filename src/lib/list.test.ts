import { describe, expect, it } from 'vitest'
import { categoryCounts, groupByCategory } from './list'
import type { Item } from './types'

function item(name: string, category: string, urgent = false): Item {
  return {
    id: name,
    family_id: 'family',
    name,
    category,
    status: 'to_buy',
    urgent,
    note: null,
    quantity: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    bought_at: null,
  }
}

describe('list ordering', () => {
  it('segue l’ordine categorie del percorso negozio', () => {
    const items = [item('Pasta', 'Dispensa'), item('Detersivo', 'Casa'), item('Mele', 'Frutta')]
    const order = ['Casa', 'Dispensa', 'Frutta']

    expect(groupByCategory(items, order).map(([category]) => category)).toEqual([
      'Casa',
      'Dispensa',
      'Frutta',
    ])
    expect(categoryCounts(items, order).map(([category]) => category)).toEqual([
      'Casa',
      'Dispensa',
      'Frutta',
    ])
  })

  it('mette gli urgenti in cima dentro la categoria', () => {
    const items = [item('Pane', 'Freschi'), item('Latte', 'Freschi', true)]

    expect(groupByCategory(items, ['Freschi'])[0]?.[1].map((entry) => entry.name)).toEqual([
      'Latte',
      'Pane',
    ])
  })
})
