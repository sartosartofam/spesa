import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { itemsRepository } from '../lib/data'
import { type ListHistoryEntry, type ListSnapshot, snapshotOperations } from '../lib/history'
import { sortHistory } from '../lib/list'
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

const MAX_HISTORY = 40

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Errore imprevisto.'
}

function snapshotOf(state: ShoppingListState): ListSnapshot {
  return { active: state.active, history: state.history }
}

function itemName(state: ShoppingListState, id: string): string {
  return (
    state.active.find((item) => item.id === id)?.name ??
    state.history.find((item) => item.id === id)?.name ??
    'Articolo'
  )
}

export function useShoppingList() {
  const [state, setState] = useState<ShoppingListState>(EMPTY_STATE)
  const stateRef = useRef(state)
  const [undoStack, setUndoStack] = useState<ListHistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<ListHistoryEntry[]>([])
  const [historyBusy, setHistoryBusy] = useState(false)
  const historyBusyRef = useRef(false)

  const commit = useCallback((updater: (current: ShoppingListState) => ShoppingListState) => {
    setState((current) => {
      const next = updater(current)
      stateRef.current = next
      return next
    })
  }, [])

  const refresh = useCallback(async (): Promise<ShoppingListState> => {
    commit((current) => ({ ...current, loading: true, error: null }))
    try {
      const [active, history, suggestions] = await Promise.all([
        itemsRepository.list('active'),
        itemsRepository.list('history'),
        itemsRepository.suggestions(),
      ])
      const next = { active, history, suggestions, loading: false, error: null }
      stateRef.current = next
      setState(next)
      return next
    } catch (error) {
      const next = { ...stateRef.current, loading: false, error: messageOf(error) }
      stateRef.current = next
      setState(next)
      return next
    }
  }, [commit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = useCallback(
    async (action: () => Promise<unknown>, label: string) => {
      const before = snapshotOf(stateRef.current)
      try {
        await action()
        const next = await refresh()
        const entry: ListHistoryEntry = { label, before, after: snapshotOf(next) }
        setUndoStack((current) => [...current, entry].slice(-MAX_HISTORY))
        setRedoStack([])
      } catch (error) {
        commit((current) => ({ ...current, error: messageOf(error) }))
      }
    },
    [commit, refresh],
  )

  const add = useCallback(
    async (input: NewItem) => {
      const name = input.name.trim() || 'articolo'
      await run(() => itemsRepository.add(input), `aggiunta di “${name}”`)
    },
    [run],
  )

  const update = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Item, 'name' | 'category' | 'note' | 'quantity' | 'urgent'>>,
    ) => {
      const name = patch.name?.trim() || itemName(stateRef.current, id)
      await run(() => itemsRepository.update(id, patch), `modifica di “${name}”`)
    },
    [run],
  )

  const changeStatus = useCallback(
    async (id: string, status: ItemStatus, label: string) => {
      await run(() => itemsRepository.setStatus(id, status), label)
    },
    [run],
  )

  const setStatus = useCallback(
    async (id: string, status: ItemStatus) => {
      const name = itemName(stateRef.current, id)
      const label =
        status === 'bought' ? `“${name}” segnato come preso` : `“${name}” rimesso in lista`
      await changeStatus(id, status, label)
    },
    [changeStatus],
  )

  const remove = useCallback(
    async (id: string) => {
      const name = itemName(stateRef.current, id)
      await run(() => itemsRepository.remove(id), `eliminazione di “${name}”`)
    },
    [run],
  )

  const restore = useCallback(
    async (id: string) => {
      const name = itemName(stateRef.current, id)
      await changeStatus(id, 'to_buy', `“${name}” rimesso in lista`)
    },
    [changeStatus],
  )

  const applySnapshot = useCallback(async (target: ListSnapshot, source: ListSnapshot) => {
    for (const operation of snapshotOperations(target, source)) {
      if (operation.type === 'remove') {
        await itemsRepository.remove(operation.id)
      } else {
        await itemsRepository.restoreItem(operation.item)
      }
    }
  }, [])

  const undo = useCallback(async (): Promise<string | null> => {
    const entry = undoStack.at(-1)
    if (!entry || historyBusyRef.current) return null

    historyBusyRef.current = true
    setHistoryBusy(true)
    try {
      await applySnapshot(entry.before, entry.after)
      await refresh()
      setUndoStack((current) => current.slice(0, -1))
      setRedoStack((current) => [...current, entry])
      return entry.label
    } catch (error) {
      commit((current) => ({ ...current, error: messageOf(error) }))
      return null
    } finally {
      historyBusyRef.current = false
      setHistoryBusy(false)
    }
  }, [applySnapshot, commit, refresh, undoStack])

  const redo = useCallback(async (): Promise<string | null> => {
    const entry = redoStack.at(-1)
    if (!entry || historyBusyRef.current) return null

    historyBusyRef.current = true
    setHistoryBusy(true)
    try {
      await applySnapshot(entry.after, entry.before)
      await refresh()
      setRedoStack((current) => current.slice(0, -1))
      setUndoStack((current) => [...current, entry])
      return entry.label
    } catch (error) {
      commit((current) => ({ ...current, error: messageOf(error) }))
      return null
    } finally {
      historyBusyRef.current = false
      setHistoryBusy(false)
    }
  }, [applySnapshot, commit, refresh, redoStack])

  const urgent = useMemo(() => state.active.filter((item) => item.urgent), [state.active])
  const history = useMemo(() => sortHistory(state.history), [state.history])

  return {
    ...state,
    history,
    urgent,
    counts: {
      active: state.active.length,
      urgent: urgent.length,
      history: state.history.length,
    },
    refresh,
    add,
    update,
    setStatus,
    remove,
    restore,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoLabel: undoStack.at(-1)?.label ?? null,
    redoLabel: redoStack.at(-1)?.label ?? null,
    historyBusy,
  }
}
