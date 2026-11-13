import { describe, expect, it } from 'vitest'
import { BUNDLE_BUDGET, type BundleAsset, measureBundle } from './bundle-budget'

function asset(fileName: string, bytes: string | Uint8Array): BundleAsset {
  return { fileName, bytes }
}

/**
 * Byte pseudo-casuali con seme fisso: gzip non riesce a comprimerli, quindi
 * il peso misurato dipende solo da `size` e i test restano deterministici.
 */
function noise(size: number): Uint8Array {
  const buffer = new Uint8Array(size)
  let state = 42
  for (let index = 0; index < size; index += 1) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    buffer[index] = (state >>> 16) % 256
  }
  return buffer
}

describe('measureBundle', () => {
  it('somma JS e CSS gzip separatamente', () => {
    const report = measureBundle([
      asset('assets/index-abc.js', noise(10_000)),
      asset('assets/supabase-def.js', noise(20_000)),
      asset('assets/index-ghi.css', noise(4_000)),
    ])

    expect(report.jsGzipKb).toBeGreaterThan(0)
    expect(report.cssGzipKb).toBeGreaterThan(0)
    // I due chunk JS superano il singolo CSS.
    expect(report.jsGzipKb).toBeGreaterThan(report.cssGzipKb)
    expect(report.violations).toEqual([])
  })

  it('ignora font, immagini e altri asset', () => {
    const onlyStatic = measureBundle([
      asset('assets/jetbrains-mono-latin-wght-normal.woff2', noise(40_000)),
      asset('assets/og-image.png', noise(30_000)),
      asset('icon.svg', '<svg />'),
    ])

    expect(onlyStatic).toEqual({ jsGzipKb: 0, cssGzipKb: 0, violations: [] })
  })

  it('segnala il JS oltre il budget con i numeri nel messaggio', () => {
    const report = measureBundle([asset('assets/index.js', noise(60_000))], {
      jsGzipKb: 1,
      cssGzipKb: 12,
    })

    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]).toContain('JS')
    expect(report.violations[0]).toContain(`limite di 1 kB`)
  })

  it('segnala anche il CSS oltre il budget, con entrambe le voci', () => {
    const report = measureBundle(
      [asset('assets/index.js', noise(60_000)), asset('assets/index.css', noise(60_000))],
      { jsGzipKb: 1, cssGzipKb: 1 },
    )

    expect(report.violations).toHaveLength(2)
    expect(report.violations[0]).toContain('JS')
    expect(report.violations[1]).toContain('CSS')
  })

  it('arrotonda a un decimale', () => {
    const report = measureBundle([asset('assets/index.js', noise(3_000))])
    expect(String(report.jsGzipKb)).toMatch(/^\d+(\.\d)?$/)
  })

  it('accetta stringhe e byte come sorgente', () => {
    const fromString = measureBundle([asset('assets/a.js', 'console.log("ciao")')])
    const fromBytes = measureBundle([
      asset('assets/a.js', new TextEncoder().encode('console.log("ciao")')),
    ])

    expect(fromString).toEqual(fromBytes)
  })

  it('il budget di default lascia margine sul bundle attuale', () => {
    // Se qualcuno abbassa i limiti sotto i valori misurati, questo test cade
    // prima della build: i numeri veri sono in `docs/SETUP.md`.
    expect(BUNDLE_BUDGET.jsGzipKb).toBeGreaterThan(98)
    expect(BUNDLE_BUDGET.cssGzipKb).toBeGreaterThan(9)
  })
})
