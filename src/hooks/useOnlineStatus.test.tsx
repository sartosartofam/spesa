import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

function Probe() {
  const online = useOnlineStatus()
  return <span data-testid="online">{online ? 'online' : 'offline'}</span>
}

let container: HTMLDivElement | null = null

function mount() {
  container = document.createElement('div')
  document.body.append(container)
  render(<Probe />, container)
}

function status(): string | undefined {
  return document.querySelector('[data-testid="online"]')?.textContent ?? undefined
}

/** Preact applica gli effetti dopo il paint: lasciamo girare un frame. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

describe('useOnlineStatus', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  afterEach(() => {
    if (container) render(null, container)
    container = null
    document.body.innerHTML = ''
    delete (navigator as { onLine?: boolean }).onLine
  })

  it('parte dallo stato del browser', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    mount()
    await expect.poll(status).toBe('offline')
  })

  it('segue gli eventi online e offline', async () => {
    mount()
    await expect.poll(status).toBe('online')
    await settle()

    window.dispatchEvent(new Event('offline'))
    await expect.poll(status).toBe('offline')

    window.dispatchEvent(new Event('online'))
    await expect.poll(status).toBe('online')
  })

  it('rimuove i listener quando viene smontato', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    mount()
    await expect.poll(status).toBe('online')
    await settle()

    render(null, container as HTMLDivElement)
    container = null

    const removed = removeListener.mock.calls.map(([event]) => event)
    expect(removed).toContain('online')
    expect(removed).toContain('offline')
    removeListener.mockRestore()
  })
})
