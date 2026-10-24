import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCustomCategory,
  appendCustomCategory,
  categoriesFromCustom,
  categoryRank,
  normalizeCustomCategories,
  readCategories,
  readCustomCategories,
  writeCustomCategories,
} from './categories'

describe('categorie', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('parte dalle categorie di base con Altro in fondo', () => {
    const categories = readCategories()

    expect(categories[0]).toBe('Frutta e verdura')
    expect(categories.at(-1)).toBe('Altro')
  })

  it('aggiunge una categoria personalizzata senza duplicati', () => {
    addCustomCategory('Panetteria')
    addCustomCategory('  panetteria  ')

    const categories = readCategories()
    const matches = categories.filter((category) => category.toLowerCase() === 'panetteria')

    expect(matches).toEqual(['Panetteria'])
    expect(categories.at(-1)).toBe('Altro')
  })

  it('ignora categorie vuote o già esistenti', () => {
    const before = readCategories()

    addCustomCategory('   ')
    addCustomCategory('Dispensa')

    expect(readCategories()).toEqual(before)
  })

  it('mette le categorie personalizzate prima di Altro', () => {
    expect(categoryRank('Panetteria')).toBeLessThan(categoryRank('Altro'))
  })

  it('normalizza elenchi arbitrari e scarta le categorie di base', () => {
    expect(normalizeCustomCategories([' Panetteria ', 42, 'panetteria', 'Casa', '', null])).toEqual(
      ['Panetteria'],
    )
  })

  it('costruisce le categorie da un elenco in memoria', () => {
    const categories = categoriesFromCustom(['Panetteria'])

    expect(categories[0]).toBe('Frutta e verdura')
    expect(categories).toContain('Panetteria')
    expect(categories.at(-1)).toBe('Altro')
  })

  it('unisce una categoria senza toccare lo storage', () => {
    expect(appendCustomCategory([], 'Panetteria')).toEqual(['Panetteria'])
    expect(readCustomCategories()).toEqual([])
  })

  it('scrive le categorie personalizzate normalizzate', () => {
    writeCustomCategories(['Panetteria', 'Panetteria', 'Dispensa'])

    expect(readCustomCategories()).toEqual(['Panetteria'])
  })
})
