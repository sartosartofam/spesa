import { useRef } from 'preact/hooks'
import type { ListView } from '../lib/types'

interface ListTabsProps {
  view: ListView
  counts: { active: number; history: number }
  onChange: (view: ListView) => void
}

/**
 * Tab della lista con il pattern ARIA completo: roving tabindex, frecce
 * sinistra/destra, Home/End e collegamento al pannello della lista.
 */
export function ListTabs({ view, counts, onChange }: ListTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const historyRef = useRef<HTMLButtonElement>(null)

  function handleKeyDown(event: KeyboardEvent) {
    let next: ListView | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      next = view === 'active' ? 'history' : 'active'
    } else if (event.key === 'Home') {
      next = 'active'
    } else if (event.key === 'End') {
      next = 'history'
    }
    if (!next) return

    event.preventDefault()
    if (next !== view) onChange(next)
    const target = next === 'active' ? activeRef.current : historyRef.current
    target?.focus()
  }

  return (
    <div class="tabs" role="tablist" aria-label="Viste della lista" onKeyDown={handleKeyDown}>
      <button
        ref={activeRef}
        class={`tab ${view === 'active' ? 'tab--active' : ''}`}
        type="button"
        role="tab"
        id="tab-active"
        aria-controls="list-tabpanel"
        aria-selected={view === 'active'}
        tabIndex={view === 'active' ? 0 : -1}
        onClick={() => onChange('active')}
      >
        Da prendere
        <span class="tab__count">{counts.active}</span>
      </button>
      <button
        ref={historyRef}
        class={`tab ${view === 'history' ? 'tab--active' : ''}`}
        type="button"
        role="tab"
        id="tab-history"
        aria-controls="list-tabpanel"
        aria-selected={view === 'history'}
        tabIndex={view === 'history' ? 0 : -1}
        onClick={() => onChange('history')}
      >
        Storico
        <span class="tab__count">{counts.history}</span>
      </button>
    </div>
  )
}
