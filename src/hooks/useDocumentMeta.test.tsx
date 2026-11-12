import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DocumentMeta } from './useDocumentMeta'
import { useDocumentMeta } from './useDocumentMeta'

let container: HTMLElement | null = null

function TestComp(meta: DocumentMeta) {
  useDocumentMeta(meta)
  return null
}

function renderMeta(meta: DocumentMeta): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  render(<TestComp {...meta} />, container)
  // Preact esegue gli effetti in modo asincrono: attende il flush.
  return new Promise((resolve) => {
    setTimeout(resolve, 50)
  })
}

describe('useDocumentMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  afterEach(() => {
    container?.remove()
    container = null
  })

  it('imposta title, description e robots', async () => {
    await renderMeta({
      title: 'Accedi | Spesa',
      description: 'Descrizione login',
      robots: 'noindex, nofollow',
    })
    expect(document.title).toBe('Accedi | Spesa')
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      'Descrizione login',
    )
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe(
      'noindex, nofollow',
    )
  })

  it('senza robots rimuove il meta', async () => {
    await renderMeta({ title: 'T', description: 'D' })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('vista indicizzabile: canonical, og:url, og:title e twitter aggiornati', async () => {
    await renderMeta({
      title: 'Spesa',
      description: 'Lista della spesa',
      robots: 'index, follow',
      urlPath: '/',
    })
    // jsdom imposta origin http://localhost:3000.
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'http://localhost:3000/',
    )
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe(
      'http://localhost:3000/',
    )
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content).toBe(
      'Spesa',
    )
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content,
    ).toBe('Lista della spesa')
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content,
    ).toBe('Spesa')
  })

  it('vista non indicizzabile: nessun canonical né og:url', async () => {
    await renderMeta({ title: 'App | Spesa', description: 'Lista', robots: 'noindex, nofollow' })
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  })

  it('cambiando vista rimuove canonical della vista precedente', async () => {
    await renderMeta({ title: 'Spesa', description: 'D', robots: 'index, follow', urlPath: '/' })
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull()
    await renderMeta({ title: 'Accedi | Spesa', description: 'D', robots: 'noindex, nofollow' })
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  })
})
