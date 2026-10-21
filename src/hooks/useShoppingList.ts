import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import type { Item, ItemStatus, NewItem } from '../lib/types'
import { itemsRepository } from '../lib/data'

interface ShoppingListState {
  active: Item[]
  history: Item[]
  suggestions: string[]
  loading: boolean
  error: string | null
}

const EMPTY_STATE: ShoppingListState = {
  active: [],
  history: [],
  suggestions: [],
  loading: true,
  error: null,
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Errore imprevisto.'
}

export function useShoppingList() {
  const [state, setState] = useState<ShoppingListState>(EMPTY_STATE)

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const [active, history, suggestions] = await Promise.all([
        itemsRepository.list('active'),
        itemsRepository.list('history'),
        itemsRepository.suggestions(),
      ])
      setState({ active, history, suggestions, loading: false, error: null })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: messageOf(error) }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const add = useCallback(
    async (input: NewItem) => {
      try {
        await itemsRepository.add(input)
        await refresh()
      } catch (error) {
        setState((current) => ({ ...current, error: messageOf(error) }))
      }
    },
    [refresh],
  )

  const setStatus = useCallback(
    async (id: string, status: ItemStatus) => {
      try {
        await itemsRepository.setStatus(id, status)
        await refresh()
      } catch (error) {
        setState((current) => ({ ...current, error: messageOf(error) }))
      }
    },
    [refresh],
  )

  const urgent = useMemo(
    () => state.active.filter((item) => item.status === 'finished'),
    [state.active],
  )

  const toBuyByCategory = useMemo(() => {
    const groups = new Map<string, Item[]>()
    for (const item of state.active) {
      if (item.status !== 'to_buy') continue
      const category = item.category ?? 'Altro'
      const bucket = groups.get(category)
      if (bucket) bucket.push(item)
      else groups.set(category, [item])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))
  }, [state.active])

  return {
    ...state,
    urgent,
    toBuyByCategory,
    counts: { active: state.active.length, history: state.history.length },
    refresh,
    add,
    setStatus,
  }
}

export type ShoppingList = ReturnType<typeof useShoppingList>
