import { describe, expect, it } from 'vitest'
import { resolveDataMode } from './index'

describe('data mode', () => {
  it('usa Supabase quando l’ambiente è configurato', () => {
    expect(resolveDataMode(undefined, true)).toBe('supabase')
  })

  it('usa il mock quando l’ambiente non è configurato', () => {
    expect(resolveDataMode(undefined, false)).toBe('mock')
  })

  it('rispetta VITE_DATA_MODE=mock anche con Supabase configurato', () => {
    expect(resolveDataMode('mock', true)).toBe('mock')
    expect(resolveDataMode(' MOCK ', true)).toBe('mock')
  })

  it('usa Supabase quando richiesto esplicitamente', () => {
    expect(resolveDataMode('supabase', false)).toBe('supabase')
  })

  it('ignora valori sconosciuti e ricade sulla configurazione', () => {
    expect(resolveDataMode('boh', true)).toBe('supabase')
    expect(resolveDataMode('boh', false)).toBe('mock')
  })
})
