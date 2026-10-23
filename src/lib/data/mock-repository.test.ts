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
    expect(active.every((item) => item.status === 'to_buy')).toBe(true)
    expect(history.every((item) => item.status === 'bought')).toBe(true)
  })

  it('tiene gli urgenti in cima alla lista attiva', async () => {
    const repository = createMockItemsRepository()

    const active = await repository.list('active')

    expect(active[0]?.urgent).toBe(true)
  })

  it('aggiunge un articolo normalizzando nome e categoria', async () => {
    const repository = createMockItemsRepository()

    const item = await repository.add({ name: '  Latte  ', category: ' Freschi ' })

    expect(item.name).toBe('Latte')
    expect(item.category).toBe('Freschi')
    expect(item.status).toBe('to_buy')
    expect(item.urgent).toBe(false)
    expect(item.quantity).toBeNull()
  })

  it('salva quantità e urgenza', async () => {
    const repository = createMockItemsRepository()

    const item = await repository.add({
      name: 'Pasta',
      category: 'Dispensa',
      quantity: '3 pacchi',
      urgent: true,
    })

    expect(item.quantity).toBe('3 pacchi')
    expect(item.urgent).toBe(true)
  })

  it('sposta un articolo nello storico quando viene preso e toglie l’urgenza', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({ name: 'Pane', urgent: true })

    await repository.setStatus(item.id, 'bought')

    const history = await repository.list('history')
    expect(history[0]?.id).toBe(item.id)
    expect(history[0]?.urgent).toBe(false)
    expect(history[0]?.bought_at).not.toBeNull()
  })

  it('rimette in lista un articolo preso', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({ name: 'Pane' })
    await repository.setStatus(item.id, 'bought')

    await repository.setStatus(item.id, 'to_buy')

    const active = await repository.list('active')
    expect(active.some((candidate) => candidate.id === item.id)).toBe(true)
  })

  it('aggiorna i dettagli di un articolo', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({ name: 'Pane' })

    const updated = await repository.update(item.id, {
      name: 'Pane integrale',
      quantity: '2 confezioni',
      urgent: true,
    })

    expect(updated.name).toBe('Pane integrale')
    expect(updated.quantity).toBe('2 confezioni')
    expect(updated.urgent).toBe(true)
  })

  it('suggerisce i nomi già usati', async () => {
    const repository = createMockItemsRepository()
    await repository.add({ name: 'Caffè' })

    await expect(repository.suggestions()).resolves.toContain('Caffè')
  })
})
