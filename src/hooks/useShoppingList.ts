import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { itemsRepository } from '../lib/data'
import { categoryCounts, groupByCategory, sortHistory } from '../lib/list'
import type { Item, ItemStatus, NewItem } from '../lib/types'

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

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action()
        await refresh()
      } catch (error) {
        setState((current) => ({ ...current, error: messageOf(error) }))
      }
    },
    [refresh],
  )

  const add = useCallback(
    async (input: NewItem) => {
      await run(() => itemsRepository.add(input))
    },
    [run],
  )

  const update = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Item, 'name' | 'category' | 'note' | 'quantity' | 'urgent'>>,
    ) => {
      await run(() => itemsRepository.update(id, patch))
    },
    [run],
  )

  const setStatus = useCallback(
    async (id: string, status: ItemStatus) => {
      await run(() => itemsRepository.setStatus(id, status))
    },
    [run],
  )

  const toggleUrgent = useCallback(
    async (item: Item) => {
      await run(async () => {
        if (item.status === 'bought') {
          await itemsRepository.setStatus(item.id, 'to_buy')
          await itemsRepository.update(item.id, { urgent: true })
          return
        }
        await itemsRepository.update(item.id, { urgent: !item.urgent })
      })
    },
    [run],
  )

  const remove = useCallback(
    async (id: string) => {
      await run(() => itemsRepository.remove(id))
    },
    [run],
  )

  const restore = useCallback(
    async (id: string) => {
      await run(() => itemsRepository.setStatus(id, 'to_buy'))
    },
    [run],
  )

  const urgent = useMemo(() => state.active.filter((item) => item.urgent), [state.active])
  const byCategory = useMemo(() => groupByCategory(state.active), [state.active])
  const history = useMemo(() => sortHistory(state.history), [state.history])
  const categories = useMemo(() => categoryCounts(state.active), [state.active])

  return {
    ...state,
    history,
    urgent,
    byCategory,
    categories,
    counts: {
      active: state.active.length,
      urgent: urgent.length,
      history: state.history.length,
    },
    refresh,
    add,
    update,
    setStatus,
    toggleUrgent,
    remove,
    restore,
  }
}

export type ShoppingList = ReturnType<typeof useShoppingList>
