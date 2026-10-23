import { describe, expect, it } from 'vitest'
import {
  mergeImportedPresets,
  normalizePresets,
  parsePresetImport,
  serializePresets,
} from './order-presets'

const CATEGORIES = ['Frutta e verdura', 'Freschi', 'Dispensa', 'Casa', 'Altro']

describe('order presets', () => {
  it('normalizza ordine, id e nomi dei preset', () => {
    const presets = normalizePresets(
      [
        { id: 'a', name: ' Esselunga ', order: ['Casa', 'Dispensa'] },
        { id: 'a', name: 'Esselunga', order: ['Freschi'] },
      ],
      CATEGORIES,
    )

    expect(presets).toHaveLength(2)
    expect(presets[0]?.name).toBe('Esselunga')
    expect(presets[0]?.order).toEqual(['Casa', 'Dispensa', 'Frutta e verdura', 'Freschi', 'Altro'])
    expect(presets[1]?.id).not.toBe('a')
    expect(presets[1]?.name).toBe('Esselunga (2)')
  })

  it('crea un preset predefinito se non c’è nulla di valido', () => {
    const presets = normalizePresets([], CATEGORIES)

    expect(presets).toHaveLength(1)
    expect(presets[0]?.id).toBe('default')
    expect(presets[0]?.order.at(-1)).toBe('Altro')
  })

  it('importa un singolo preset da JSON', () => {
    const result = parsePresetImport(
      JSON.stringify({ name: 'Esselunga', order: ['Casa', 'Dispensa'] }),
      'negozio.json',
      CATEGORIES,
    )

    expect(result.presets).toHaveLength(1)
    expect(result.presets[0]?.name).toBe('Esselunga')
    expect(result.presets[0]?.order).toEqual([
      'Casa',
      'Dispensa',
      'Frutta e verdura',
      'Freschi',
      'Altro',
    ])
    expect(result.warnings).toEqual([])
  })

  it('importa più preset da JSON e segnala le categorie sconosciute', () => {
    const result = parsePresetImport(
      JSON.stringify({
        presets: [
          { name: 'Esselunga', order: ['Casa'] },
          { name: 'Conad', order: ['Dispensa', 'Panetteria'] },
        ],
      }),
      'negozi.json',
      CATEGORIES,
    )

    expect(result.presets.map((preset) => preset.name)).toEqual(['Esselunga', 'Conad'])
    expect(result.warnings).toEqual(['Categoria ignorata: Panetteria.'])
  })

  it('importa un CSV con colonne preset,categoria', () => {
    const result = parsePresetImport(
      'preset,categoria\nEsselunga,Casa\nEsselunga,Dispensa\nConad,Freschi\n',
      'negozi.csv',
      CATEGORIES,
    )

    expect(result.presets.map((preset) => preset.name)).toEqual(['Esselunga', 'Conad'])
    expect(result.presets[0]?.order.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
    expect(result.presets[1]?.order[0]).toBe('Freschi')
  })

  it('importa CSV con BOM e delimitatore punto e virgola', () => {
    const result = parsePresetImport(
      '\uFEFFpreset;categoria\nEsselunga;Casa\nEsselunga;Dispensa\n',
      'negozi.csv',
      CATEGORIES,
    )

    expect(result.presets).toHaveLength(1)
    expect(result.presets[0]?.name).toBe('Esselunga')
    expect(result.presets[0]?.order.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
  })

  it('importa un CSV a una colonna usando il nome del file', () => {
    const result = parsePresetImport('categoria\n"Casa"\nDispensa\n', 'mio-negozio.csv', CATEGORIES)

    expect(result.presets).toHaveLength(1)
    expect(result.presets[0]?.name).toBe('mio-negozio')
    expect(result.presets[0]?.order.slice(0, 2)).toEqual(['Casa', 'Dispensa'])
  })

  it('aggiorna i preset con lo stesso nome e aggiunge quelli nuovi', () => {
    const current = normalizePresets(
      [{ id: 'default', name: 'Il mio negozio', order: ['Casa'] }],
      CATEGORIES,
    )
    const imported = [
      { id: 'import-1', name: 'Il mio negozio', order: ['Dispensa', 'Casa'] },
      { id: 'import-2', name: 'Esselunga', order: ['Freschi'] },
    ]

    const merged = mergeImportedPresets(current, imported)

    expect(merged.updated).toBe(1)
    expect(merged.added).toBe(1)
    expect(merged.activePresetId).toBe('default')
    expect(merged.presets).toHaveLength(2)
    expect(merged.presets[0]?.order.slice(0, 2)).toEqual(['Dispensa', 'Casa'])
    expect(merged.presets[1]?.name).toBe('Esselunga')
  })

  it('esporta un JSON senza id interni', () => {
    const presets = normalizePresets(
      [{ id: 'default', name: 'Esselunga', order: ['Casa'] }],
      CATEGORIES,
    )
    const parsed = JSON.parse(serializePresets(presets)) as {
      version: number
      presets: Array<{ name: string; order: string[] }>
    }

    expect(parsed.version).toBe(1)
    expect(parsed.presets[0]?.name).toBe('Esselunga')
    expect(parsed.presets[0]?.order[0]).toBe('Casa')
  })
})
