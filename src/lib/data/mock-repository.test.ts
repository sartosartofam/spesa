import { beforeEach, describe, expect, it } from 'vitest'
import { createMockItemsRepository } from './mock-repository'

describe('mock items repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('parte con articoli attivi e storico separati', async () => {
    const repository = createMockItemsRepository()

    const active = await repository.list('active')
    const history = await repository.list('history')

    expect(active.length).toBeGreaterThan(0)
    expect(active.every((item) => item.status !== 'bought')).toBe(true)
    expect(history.every((item) => item.status === 'bought')).toBe(true)
  })

  it('aggiunge un articolo normalizzando nome e categoria', async () => {
    const repository = createMockItemsRepository()

    const item = await repository.add({ name: '  Latte  ', category: ' Freschi ' })

    expect(item.name).toBe('Latte')
    expect(item.category).toBe('Freschi')
    expect(item.status).toBe('to_buy')
  })

  it('sposta un articolo nello storico quando viene preso', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({ name: 'Pane' })

    await repository.setStatus(item.id, 'bought')

    const history = await repository.list('history')
    expect(history[0]?.id).toBe(item.id)
  })

  it('suggerisce i nomi già usati', async () => {
    const repository = createMockItemsRepository()
    await repository.add({ name: 'Caffè' })

    await expect(repository.suggestions()).resolves.toContain('Caffè')
  })
})
