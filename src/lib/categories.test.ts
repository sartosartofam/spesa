import { beforeEach, describe, expect, it } from 'vitest'
import { addCustomCategory, categoryRank, readCategories } from './categories'

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
})
