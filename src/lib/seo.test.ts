import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import {
  absolutePath,
  buildRobotsTxt,
  buildSitemapXml,
  INDEXABLE_PATHS,
  normalizeSiteUrl,
} from './seo'

describe('tag statici in index.html', () => {
  it('esponde Open Graph completo', () => {
    expect(indexHtml).toContain('property="og:title"')
    expect(indexHtml).toContain('property="og:description"')
    expect(indexHtml).toContain('property="og:type"')
    expect(indexHtml).toContain('property="og:site_name"')
    expect(indexHtml).toContain('property="og:locale"')
    expect(indexHtml).toContain('content="/og-image.png"')
    expect(indexHtml).toContain('property="og:image:width" content="1200"')
    expect(indexHtml).toContain('property="og:image:height" content="630"')
    expect(indexHtml).toContain('property="og:image:alt"')
  })

  it('esponde la Twitter Card summary_large_image', () => {
    expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"')
    expect(indexHtml).toContain('name="twitter:title"')
    expect(indexHtml).toContain('name="twitter:description"')
    expect(indexHtml).toContain('name="twitter:image"')
  })

  it('esponde JSON-LD WebApplication gratuito', () => {
    expect(indexHtml).toContain('"@type": "WebApplication"')
    expect(indexHtml).toContain('"price": "0"')
    expect(indexHtml).toContain('"inLanguage": "it"')
  })

  it('non hardcodà domini di produzione: gli assoluti arrivano da VITE_SITE_URL', () => {
    expect(indexHtml).not.toContain('rel="canonical"')
    expect(indexHtml).not.toContain('property="og:url"')
  })
})

describe('normalizeSiteUrl', () => {
  it('restituisce stringa vuota se la variabile manca o è vuota', () => {
    expect(normalizeSiteUrl(undefined)).toBe('')
    expect(normalizeSiteUrl('')).toBe('')
    expect(normalizeSiteUrl('   ')).toBe('')
  })

  it('toglie la slash finale e normalizza l\u2019origine', () => {
    expect(normalizeSiteUrl('https://esempio.it')).toBe('https://esempio.it')
    expect(normalizeSiteUrl('https://esempio.it/')).toBe('https://esempio.it')
    expect(normalizeSiteUrl(' https://ESEMPIO.it// ')).toBe('https://esempio.it')
  })

  it('richiede il protocollo esplicito', () => {
    expect(() => normalizeSiteUrl('esempio.it')).toThrow('VITE_SITE_URL non valido')
  })

  it('rifiuta protocolli non http/https', () => {
    expect(() => normalizeSiteUrl('ftp://esempio.it')).toThrow('http o https')
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow('http o https')
  })

  it('rifiuta http fuori da localhost', () => {
    expect(() => normalizeSiteUrl('http://esempio.it')).toThrow('localhost')
    expect(normalizeSiteUrl('http://localhost:5173')).toBe('http://localhost:5173')
    expect(normalizeSiteUrl('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173')
  })
})

describe('absolutePath', () => {
  it('senza siteUrl restituisce il path relativo', () => {
    expect(absolutePath('', '/privacy')).toBe('/privacy')
  })

  it('unisce origine e path senza doppie slash', () => {
    expect(absolutePath('https://esempio.it', '/')).toBe('https://esempio.it/')
    expect(absolutePath('https://esempio.it', '/privacy')).toBe('https://esempio.it/privacy')
    expect(absolutePath('https://esempio.it', 'privacy')).toBe('https://esempio.it/privacy')
  })
})

describe('buildSitemapXml', () => {
  it('elenco le viste indicizzabili con URL assoluti', () => {
    const xml = buildSitemapXml('https://esempio.it', '2026-11-12')
    expect(xml).toContain('<loc>https://esempio.it/</loc>')
    expect(xml).toContain('<loc>https://esempio.it/privacy</loc>')
    expect(xml).toContain('<lastmod>2026-11-12</lastmod>')
  })

  it('senza siteUrl restituisce path relativi', () => {
    const xml = buildSitemapXml('', '2026-11-12')
    expect(xml).toContain('<loc>/</loc>')
  })

  it('INDEXABLE_PATHS non include viste private', () => {
    const all = INDEXABLE_PATHS.join(' ')
    expect(all).not.toContain('/login')
    expect(all).not.toContain('/app')
    expect(all).not.toContain('/register')
    expect(all).not.toContain('/reset-password')
  })
})

describe('buildRobotsTxt', () => {
  it('permette il crawl e dichiara la sitemap quando c\u2019è il dominio', () => {
    const txt = buildRobotsTxt('https://esempio.it')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Sitemap: https://esempio.it/sitemap.xml')
  })

  it('senza dominio omette la riga Sitemap', () => {
    const txt = buildRobotsTxt('')
    expect(txt).toContain('Allow: /')
    expect(txt).not.toContain('Sitemap:')
  })
})
