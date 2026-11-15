import { describe, expect, it } from 'vitest'
import { collectPrecacheAssets, PRECACHE_MANIFEST_FILE } from './precache'

describe('collectPrecacheAssets', () => {
  it('elenca JS e CSS come URL assolute', () => {
    expect(
      collectPrecacheAssets([
        'assets/index-abc123.js',
        'assets/app-def456.js',
        'assets/index-ghi789.css',
      ]),
    ).toEqual(['/assets/app-def456.js', '/assets/index-abc123.js', '/assets/index-ghi789.css'])
  })

  it('include i chunk caricati su richiesta anche se non sono in index.html', () => {
    // È il motivo per cui esiste il manifest: senza, il chunk dell'app
    // resterebbe fuori dalla cache e l'offline mostrerebbe solo il caricamento.
    expect(collectPrecacheAssets(['assets/app-chunk.js'])).toContain('/assets/app-chunk.js')
  })

  it('scarta font, immagini, HTML e file di root', () => {
    const assets = collectPrecacheAssets([
      'assets/jetbrains-mono-latin-wght-normal.woff2',
      'assets/og-image.png',
      'assets/icon.svg',
      'index.html',
      'robots.txt',
      'sitemap.xml',
      PRECACHE_MANIFEST_FILE,
    ])

    expect(assets).toEqual([])
  })

  it('ignora i duplicati e tiene un ordine stabile', () => {
    const first = collectPrecacheAssets(['assets/b.js', 'assets/a.js', 'assets/b.js'])
    const second = collectPrecacheAssets(['assets/a.js', 'assets/b.js'])

    expect(first).toEqual(['/assets/a.js', '/assets/b.js'])
    expect(first).toEqual(second)
  })
})
