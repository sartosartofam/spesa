import type { ListView } from '../lib/types'

interface ListTabsProps {
  view: ListView
  counts: { active: number; history: number }
  onChange: (view: ListView) => void
}

export function ListTabs({ view, counts, onChange }: ListTabsProps) {
  return (
    <div class="tabs" role="tablist" aria-label="Viste della lista">
      <button
        class={`tab ${view === 'active' ? 'tab--active' : ''}`}
        type="button"
        role="tab"
        aria-selected={view === 'active'}
        onClick={() => onChange('active')}
      >
        Da prendere
        <span class="tab__count">{counts.active}</span>
      </button>
      <button
        class={`tab ${view === 'history' ? 'tab--active' : ''}`}
        type="button"
        role="tab"
        aria-selected={view === 'history'}
        onClick={() => onChange('history')}
      >
        Storico
        <span class="tab__count">{counts.history}</span>
      </button>
    </div>
  )
}
