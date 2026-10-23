import { useState } from 'preact/hooks'
import { useModalDialog } from '../hooks/useModalDialog'
import { CloseIcon } from './Icons'

interface FiltersDialogProps {
  categories: Array<[string, number]>
  selectedCategories: string[]
  urgentOnly: boolean
  showUrgent: boolean
  onApply: (urgentOnly: boolean, categories: string[]) => void
  onClose: () => void
}

export function FiltersDialog({
  categories,
  selectedCategories,
  urgentOnly,
  showUrgent,
  onApply,
  onClose,
}: FiltersDialogProps) {
  const dialogRef = useModalDialog(onClose)
  const [urgent, setUrgent] = useState(urgentOnly)
  const [selected, setSelected] = useState<string[]>(() => [...selectedCategories])

  function toggleCategory(category: string) {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((candidate) => candidate !== category)
        : [...current, category],
    )
  }

  function submit(event: Event) {
    event.preventDefault()
    onApply(urgent, selected)
    onClose()
  }

  function clear() {
    setUrgent(false)
    setSelected([])
  }

  return (
    <dialog
      ref={dialogRef}
      class="sheet"
      aria-labelledby="filters-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form class="sheet__body" onSubmit={submit}>
        <header class="sheet__header">
          <h2 id="filters-dialog-title">Filtri</h2>
          <button class="icon-button" type="button" aria-label="Chiudi" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        {showUrgent && (
          <label class="filter-option filter-option--urgent">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(event) => setUrgent(event.currentTarget.checked)}
            />
            <span>Solo urgenti</span>
          </label>
        )}

        <div class="field">
          <span class="field__label">Categorie</span>
          {categories.length === 0 ? (
            <p class="hint">Nessuna categoria disponibile.</p>
          ) : (
            <ul class="filter-options">
              {categories.map(([category, count]) => (
                <li key={category}>
                  <label class="filter-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span>{category}</span>
                    <span class="filter-option__count">{count}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="dialog-actions">
          <button class="button button--ghost" type="button" onClick={clear}>
            Azzera
          </button>
          <button class="button button--primary" type="submit">
            Applica
          </button>
        </div>
      </form>
    </dialog>
  )
}
