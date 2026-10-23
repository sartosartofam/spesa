import { beforeEach, describe, expect, it } from 'vitest'
import { activeCategoryOrder, readSettings, writeSettings } from './settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('salva e normalizza più preset del percorso negozio', () => {
    writeSettings({
      quickAdd: true,
      defaultCategory: 'Casa',
      activePresetId: 'conad',
      presets: [
        { id: 'default', name: 'Il mio negozio', order: ['Casa'] },
        { id: 'conad', name: 'Conad', order: ['Dispensa', 'Casa'] },
      ],
    })

    const settings = readSettings()

    expect(settings.quickAdd).toBe(true)
    expect(settings.defaultCategory).toBe('Casa')
    expect(settings.activePresetId).toBe('conad')
    expect(settings.presets.map((preset) => preset.name)).toEqual(['Il mio negozio', 'Conad'])
    expect(activeCategoryOrder(settings).slice(0, 2)).toEqual(['Dispensa', 'Casa'])
    expect(activeCategoryOrder(settings).at(-1)).toBe('Altro')
  })

  it('migra il vecchio ordine globale in un preset', () => {
    localStorage.setItem(
      'spesa.settings.v1',
      JSON.stringify({
        quickAdd: false,
        defaultCategory: 'Casa',
        categoryOrder: ['Casa', 'Dispensa'],
      }),
    )

    const settings = readSettings()

    expect(settings.presets).toHaveLength(1)
    expect(settings.presets[0]?.name).toBe('Il mio negozio')
    expect(settings.presets[0]?.order.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
    expect(settings.activePresetId).toBe(settings.presets[0]?.id)
  })
})
