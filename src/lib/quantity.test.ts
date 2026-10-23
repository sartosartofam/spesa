import { describe, expect, it } from 'vitest'
import { mergeQuantities } from './quantity'

describe('mergeQuantities', () => {
  it('somma quantità con la stessa unità', () => {
    expect(mergeQuantities('2 pacchi', '3 pacchi')).toBe('5 pacchi')
    expect(mergeQuantities('2', '3')).toBe('5')
    expect(mergeQuantities('1,5 kg', '0,5 kg')).toBe('2 kg')
  })

  it('mantiene una quantità quando l’altra manca', () => {
    expect(mergeQuantities(null, '2 pacchi')).toBe('2 pacchi')
    expect(mergeQuantities('500 g', null)).toBe('500 g')
  })

  it('incrementa di uno un numero senza unità e conta due pezzi se mancano entrambe', () => {
    expect(mergeQuantities('1', null)).toBe('2')
    expect(mergeQuantities('2 l', null)).toBe('2 l')
    expect(mergeQuantities(null, null)).toBe('2')
  })

  it('tiene entrambe le quantità se le unità sono diverse', () => {
    expect(mergeQuantities('1 kg', '500 g')).toBe('1 kg + 500 g')
    expect(mergeQuantities('2 confezioni', '3')).toBe('2 confezioni + 3')
  })

  it('non duplica un testo non numerico identico', () => {
    expect(mergeQuantities('q.b.', 'q.b.')).toBe('q.b.')
  })
})
