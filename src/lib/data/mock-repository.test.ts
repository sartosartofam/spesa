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

    const item = await repository.add({ name: '  Yogurt  ', category: ' Freschi ' })

    expect(item.name).toBe('Yogurt')
    expect(item.category).toBe('Freschi')
    expect(item.status).toBe('to_buy')
    expect(item.urgent).toBe(false)
    expect(item.quantity).toBeNull()
  })

  it('salva quantità e urgenza', async () => {
    const repository = createMockItemsRepository()

    const item = await repository.add({
      name: 'Riso',
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

  it('un articolo preso che diventa urgente rientra in lista con una sola update', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({ name: 'Pane' })
    await repository.setStatus(item.id, 'bought')

    const updated = await repository.update(item.id, { urgent: true })

    expect(updated.status).toBe('to_buy')
    expect(updated.urgent).toBe(true)
    expect(updated.bought_at).toBeNull()
    expect((await repository.list('history')).some((candidate) => candidate.id === item.id)).toBe(
      false,
    )
    expect((await repository.list('active')).some((candidate) => candidate.id === item.id)).toBe(
      true,
    )
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

  it('ripristina uno snapshot anche dopo modifica o eliminazione', async () => {
    const repository = createMockItemsRepository()
    const item = await repository.add({
      name: 'Biscotti',
      category: 'Freschi',
      quantity: '2 confezioni',
    })

    await repository.update(item.id, { name: 'Biscotti integrali', quantity: '3 confezioni' })
    await repository.restoreItem(item)

    let active = await repository.list('active')
    expect(active.find((candidate) => candidate.id === item.id)).toMatchObject({
      name: 'Biscotti',
      quantity: '2 confezioni',
    })

    await repository.remove(item.id)
    await repository.restoreItem(item)

    active = await repository.list('active')
    expect(active.find((candidate) => candidate.id === item.id)).toMatchObject({
      id: item.id,
      name: 'Biscotti',
      quantity: '2 confezioni',
    })
  })

  it('somma la quantità quando si aggiunge un articolo identico', async () => {
    const repository = createMockItemsRepository()

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

    const active = await repository.list('active')
    const matches = active.filter((item) => item.name.toLowerCase() === 'fagioli')

    expect(matches).toHaveLength(1)
    expect(matches[0]?.quantity).toBe('5 scatolette')
    expect(second.id).toBe(first.id)
  })

  it('incrementa lo stesso articolo anche quando la nota non coincide', async () => {
    const repository = createMockItemsRepository()

    const first = await repository.add({
      name: 'Fagioli',
      category: 'Dispensa',
      quantity: '1',
      note: 'bio',
    })
    const second = await repository.add({
      name: 'fagioli',
      category: 'Dispensa',
    })

    const active = await repository.list('active')
    const matches = active.filter((item) => item.name.toLowerCase() === 'fagioli')

    expect(matches).toHaveLength(1)
    expect(matches[0]?.quantity).toBe('2')
    expect(matches[0]?.note).toBe('bio')
    expect(second.id).toBe(first.id)
  })

  it('incrementa un articolo senza quantità già presente in lista', async () => {
    const repository = createMockItemsRepository()

    const first = await repository.add({ name: 'Grissini', category: 'Freschi' })
    const second = await repository.add({ name: 'Grissini', category: 'Freschi' })

    const active = await repository.list('active')
    const matches = active.filter((item) => item.name.toLowerCase() === 'grissini')

    expect(matches).toHaveLength(1)
    expect(matches[0]?.quantity).toBe('2')
    expect(second.id).toBe(first.id)
  })

  it('unisce due articoli quando una modifica li rende identici', async () => {
    const repository = createMockItemsRepository()

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
    const active = await repository.list('active')

    expect(merged.id).toBe(first.id)
    expect(merged.quantity).toBe('3 confezioni')
    expect(active.some((item) => item.id === second.id)).toBe(false)
    expect(active.filter((item) => item.name.toLowerCase() === 'fagioli')).toHaveLength(1)
  })

  it('suggerisce i nomi già usati', async () => {
    const repository = createMockItemsRepository()
    await repository.add({ name: 'Caffè' })

    await expect(repository.suggestions()).resolves.toContain('Caffè')
  })
})
