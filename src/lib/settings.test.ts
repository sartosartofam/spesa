import { beforeEach, describe, expect, it } from 'vitest'
import { readSettings, writeSettings } from './settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('salva e normalizza l’ordine del percorso negozio', () => {
    writeSettings({
      quickAdd: true,
      defaultCategory: 'Casa',
      categoryOrder: ['Casa', 'Dispensa'],
    })

    const settings = readSettings()

    expect(settings.quickAdd).toBe(true)
    expect(settings.defaultCategory).toBe('Casa')
    expect(settings.categoryOrder.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
    expect(settings.categoryOrder.at(-1)).toBe('Altro')
    expect(settings.categoryOrder).toContain('Frutta e verdura')
  })
})
