import { render } from 'preact'
import { useState } from 'preact/hooks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeCachedList } from '../lib/list-cache'
import type { Item } from '../lib/types'
import { useShoppingList } from './useShoppingList'

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  suggestions: vi.fn(),
  remove: vi.fn(),
}))

const push = vi.hoisted(() => ({
  sendPushNotification: vi.fn(async () => undefined),
}))

vi.mock('../lib/data', () => ({
  isLiveData: true,
  itemsRepository: {
    list: repository.list,
    add: repository.add,
    update: repository.update,
    suggestions: repository.suggestions,
    remove: repository.remove,
  },
}))

vi.mock('../lib/push', () => ({
  sendPushNotification: push.sendPushNotification,
}))

vi.mock('../lib/supabase', () => ({
  getSupabase: () => null,
}))

function item(id: string, name: string): Item {
  return {
    id,
    family_id: 'famiglia-a',
    name,
    category: 'Altro',
    status: 'to_buy',
    urgent: false,
    note: null,
    quantity: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    bought_at: null,
  }
}

function Probe() {
  const list = useShoppingList('famiglia-a')
  return (
    <div>
      <span data-testid="names">{list.active.map((entry) => entry.name).join(',')}</span>
      <span data-testid="error">{list.error ?? ''}</span>
      <button type="button" data-testid="add" onClick={() => void list.add({ name: 'Latte' })}>
        Aggiungi
      </button>
      <button
        type="button"
        data-testid="urgent"
        onClick={() => void list.update('1', { urgent: true })}
      >
        Urgente
      </button>
    </div>
  )
}

/** Mostra l'esito dell'ultima azione: serve a testare i risultati, non solo lo stato. */
function ResultProbe() {
  const list = useShoppingList('famiglia-a')
  const [result, setResult] = useState('')
  const [removed, setRemoved] = useState('')

  return (
    <div>
      <span data-testid="ready">{list.loading ? '' : 'pronto'}</span>
      <span data-testid="result">{result}</span>
      <span data-testid="removed">{removed}</span>
      <button
        type="button"
        data-testid="add"
        onClick={() => {
          void list.add({ name: 'Latte' }).then((value) => {
            setResult(value.ok ? 'ok' : `errore: ${value.message}`)
          })
        }}
      >
        Aggiungi
      </button>
      <button
        type="button"
        data-testid="remove"
        onClick={() => {
          void list.remove('1').then((value) => {
            setRemoved(value.ok ? 'ok' : `errore: ${value.message}`)
          })
        }}
      >
        Rimuovi
      </button>
    </div>
  )
}

let container: HTMLDivElement | null = null

function mount(component = <Probe />) {
  container = document.createElement('div')
  document.body.append(container)
  render(component, container)
}

describe('useShoppingList offline', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.list.mockReset()
    repository.add.mockReset()
    repository.update.mockReset()
    repository.suggestions.mockReset()
    push.sendPushNotification.mockClear()
  })

  afterEach(() => {
    if (container) render(null, container)
    container = null
    document.body.innerHTML = ''
  })

  it('usa la cache quando il primo caricamento fallisce', async () => {
    writeCachedList('famiglia-a', [item('1', 'Latte')], [], ['Latte'])
    repository.list.mockRejectedValue(new Error('Connessione assente'))
    repository.suggestions.mockRejectedValue(new Error('Connessione assente'))

    mount()

    await expect
      .poll(() => document.querySelector('[data-testid="names"]')?.textContent)
      .toBe('Latte')
    await expect
      .poll(() => document.querySelector('[data-testid="error"]')?.textContent)
      .toBe('Sei offline: mostro l’ultima lista salvata.')
  })

  it('salva la lista quando il caricamento riesce', async () => {
    repository.list.mockImplementation(async (view: 'active' | 'history') =>
      view === 'active' ? [item('1', 'Pane')] : [],
    )
    repository.suggestions.mockResolvedValue(['Pane'])

    mount()

    await expect.poll(() => localStorage.getItem('spesa.list.v1.famiglia-a')).not.toBeNull()
    const cached = JSON.parse(localStorage.getItem('spesa.list.v1.famiglia-a') ?? '{}')
    expect(cached.active[0].name).toBe('Pane')
    expect(cached.suggestions).toEqual(['Pane'])
  })

  it('notifica gli altri membri dopo un’aggiunta riuscita', async () => {
    repository.list.mockImplementation(async (view: 'active' | 'history') =>
      view === 'active' ? [item('1', 'Pane')] : [],
    )
    repository.suggestions.mockResolvedValue(['Pane'])
    repository.add.mockResolvedValue(item('2', 'Latte'))

    mount()
    await expect
      .poll(() => document.querySelector('[data-testid="names"]')?.textContent)
      .toBe('Pane')

    ;(document.querySelector('[data-testid="add"]') as HTMLButtonElement).click()

    await expect.poll(() => push.sendPushNotification.mock.calls.length).toBe(1)
    expect(push.sendPushNotification).toHaveBeenCalledWith('2', 'created')
  })

  it('notifica l’urgenza solo quando il flag passa da falso a vero', async () => {
    repository.list.mockImplementation(async (view: 'active' | 'history') =>
      view === 'active' ? [item('1', 'Pane')] : [],
    )
    repository.suggestions.mockResolvedValue(['Pane'])
    repository.update.mockResolvedValue({ ...item('1', 'Pane'), urgent: true })

    mount()
    await expect
      .poll(() => document.querySelector('[data-testid="names"]')?.textContent)
      .toBe('Pane')

    ;(document.querySelector('[data-testid="urgent"]') as HTMLButtonElement).click()

    await expect.poll(() => push.sendPushNotification.mock.calls.length).toBe(1)
    expect(push.sendPushNotification).toHaveBeenCalledWith('1', 'urgent')
  })
})

describe('useShoppingList: esiti delle azioni', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.list.mockReset()
    repository.add.mockReset()
    repository.update.mockReset()
    repository.suggestions.mockReset()
    repository.remove.mockReset()
    push.sendPushNotification.mockClear()
    repository.list.mockImplementation(async (view: 'active' | 'history') =>
      view === 'active' ? [item('1', 'Pane')] : [],
    )
    repository.suggestions.mockResolvedValue(['Pane'])
  })

  afterEach(() => {
    if (container) render(null, container)
    container = null
    document.body.innerHTML = ''
  })

  it('restituisce un errore leggibile se l’aggiunta fallisce e non notifica', async () => {
    repository.add.mockRejectedValue(new Error('Connessione assente: controlla la rete e riprova.'))

    mount(<ResultProbe />)
    await expect
      .poll(() => document.querySelector('[data-testid="ready"]')?.textContent)
      .toBe('pronto')

    ;(document.querySelector('[data-testid="add"]') as HTMLButtonElement).click()

    await expect
      .poll(() => document.querySelector('[data-testid="result"]')?.textContent)
      .toBe('errore: Connessione assente: controlla la rete e riprova.')
    expect(push.sendPushNotification).not.toHaveBeenCalled()
  })

  it('restituisce ok quando l’aggiunta riesce', async () => {
    repository.add.mockResolvedValue(item('2', 'Latte'))

    mount(<ResultProbe />)
    await expect
      .poll(() => document.querySelector('[data-testid="ready"]')?.textContent)
      .toBe('pronto')

    ;(document.querySelector('[data-testid="add"]') as HTMLButtonElement).click()

    await expect
      .poll(() => document.querySelector('[data-testid="result"]')?.textContent)
      .toBe('ok')
    expect(push.sendPushNotification).toHaveBeenCalledWith('2', 'created')
  })

  it('propaga il messaggio quando l’eliminazione fallisce', async () => {
    repository.remove.mockRejectedValue(
      new Error('Articolo non trovato: potrebbe essere stato eliminato da un altro membro.'),
    )

    mount(<ResultProbe />)
    await expect
      .poll(() => document.querySelector('[data-testid="ready"]')?.textContent)
      .toBe('pronto')

    ;(document.querySelector('[data-testid="remove"]') as HTMLButtonElement).click()

    await expect
      .poll(() => document.querySelector('[data-testid="removed"]')?.textContent)
      .toBe('errore: Articolo non trovato: potrebbe essere stato eliminato da un altro membro.')
  })
})
