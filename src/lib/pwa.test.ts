import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './pwa'

interface FakeServiceWorkerContainer {
  register: ReturnType<typeof vi.fn>
}

function installServiceWorker(): FakeServiceWorkerContainer {
  const container: FakeServiceWorkerContainer = {
    register: vi.fn(() => Promise.resolve()),
  }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container })
  return container
}

function setReadyState(state: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', { configurable: true, value: state })
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    Reflect.deleteProperty(document, 'readyState')
    vi.unstubAllEnvs()
  })

  it('in sviluppo non registra nulla', () => {
    const container = installServiceWorker()
    setReadyState('complete')

    registerServiceWorker()

    expect(container.register).not.toHaveBeenCalled()
  })

  it('nella build di produzione registra /sw.js a pagina caricata', () => {
    vi.stubEnv('PROD', true)
    const container = installServiceWorker()
    setReadyState('complete')

    registerServiceWorker()

    expect(container.register).toHaveBeenCalledWith('/sw.js')
  })

  it('se la pagina sta ancora caricando aspetta l’evento load', () => {
    vi.stubEnv('PROD', true)
    const container = installServiceWorker()
    setReadyState('loading')

    registerServiceWorker()
    expect(container.register).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('load'))
    expect(container.register).toHaveBeenCalledWith('/sw.js')
  })

  it('senza supporto al service worker non fa nulla', () => {
    vi.stubEnv('PROD', true)
    setReadyState('complete')

    expect(() => registerServiceWorker()).not.toThrow()
  })
})
