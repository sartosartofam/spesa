import { useEffect } from 'preact/hooks'

export interface DocumentMeta {
  title: string
  description: string
  robots?: string
}

function metaElement(name: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
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

/** Aggiorna title, description e robots per la vista corrente (SPA). */
export function useDocumentMeta({ title, description, robots }: DocumentMeta): void {
  useEffect(() => {
    document.title = title
    setMeta('description', description)
    if (robots) {
      setMeta('robots', robots)
    } else {
      removeMeta('robots')
    }
  }, [title, description, robots])
}
