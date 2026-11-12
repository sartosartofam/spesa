import { useEffect } from 'preact/hooks'

export interface DocumentMeta {
  title: string
  description: string
  robots?: string
  /** Percorso indicizzabile della vista (per esempio `/`): attiva canonical e og:url. */
  urlPath?: string
}

function metaElement(name: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
}

function metaPropertyElement(property: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
}

function setMeta(name: string, content: string): void {
  let element = metaElement(name)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function removeMeta(name: string): void {
  metaElement(name)?.remove()
}

function setMetaProperty(property: string, content: string): void {
  let element = metaPropertyElement(property)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function removeMetaProperty(property: string): void {
  metaPropertyElement(property)?.remove()
}

function setCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function removeCanonical(): void {
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove()
}

/**
 * Aggiorna title, description, robots e — per le viste indicizzabili —
 * canonical e i tag Open Graph/Twitter allineati alla vista corrente (SPA).
 * I tag assoluti statici (canonical e og:url) vengono comunque iniettati
 * a build da vite.config.ts per i crawler che non eseguono JavaScript.
 */
export function useDocumentMeta({ title, description, robots, urlPath }: DocumentMeta): void {
  useEffect(() => {
    document.title = title
    setMeta('description', description)
    if (robots) {
      setMeta('robots', robots)
    } else {
      removeMeta('robots')
    }

    if (urlPath) {
      const url = new URL(urlPath, window.location.origin).href
      setCanonical(url)
      setMetaProperty('og:url', url)
      setMetaProperty('og:title', title)
      setMetaProperty('og:description', description)
      setMeta('twitter:title', title)
      setMeta('twitter:description', description)
    } else {
      removeCanonical()
      removeMetaProperty('og:url')
    }
  }, [title, description, robots, urlPath])
}
