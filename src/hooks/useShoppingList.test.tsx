import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeCachedList } from '../lib/list-cache'
import type { Item } from '../lib/types'
import { useShoppingList } from './useShoppingList'

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  suggestions: vi.fn(),
}))

vi.mock('../lib/data', () => ({
  isLiveData: true,
  itemsRepository: {
    list: repository.list,
    suggestions: repository.suggestions,
  },
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
    </div>
  )
}

let container: HTMLDivElement | null = null

function mount() {
  container = document.createElement('div')
  document.body.append(container)
  render(<Probe />, container)
}

describe('useShoppingList offline', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.list.mockReset()
    repository.suggestions.mockReset()
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
})
