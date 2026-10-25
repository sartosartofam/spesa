import { beforeEach, describe, expect, it } from 'vitest'
import { readLandingGlow, writeLandingGlow } from './landing-glow'

describe('landing glow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('parte attivo quando non c’è una preferenza salvata', () => {
    expect(readLandingGlow()).toBe(true)
  })

  it('salva e rilegge la scelta locale', () => {
    writeLandingGlow(false)
    expect(localStorage.getItem('spesa.landing.glow.v1')).toBe('off')
    expect(readLandingGlow()).toBe(false)

    writeLandingGlow(true)
    expect(localStorage.getItem('spesa.landing.glow.v1')).toBe('on')
    expect(readLandingGlow()).toBe(true)
  })

  it('tratta un valore sconosciuto come attivo', () => {
    localStorage.setItem('spesa.landing.glow.v1', 'boh')
    expect(readLandingGlow()).toBe(true)
  })
})
