import { useModalDialog } from '../hooks/useModalDialog'
import { CloseIcon } from './Icons'

interface FiltersDialogProps {
  categories: Array<[string, number]>
  selectedCategories: string[]
  urgentOnly: boolean
  showUrgent: boolean
  onToggleUrgent: (urgentOnly: boolean) => void
  onToggleCategory: (category: string) => void
  onClear: () => void
  onClose: () => void
}

export function FiltersDialog({
  categories,
  selectedCategories,
  urgentOnly,
  showUrgent,
  onToggleUrgent,
  onToggleCategory,
  onClear,
  onClose,
}: FiltersDialogProps) {
  const dialogRef = useModalDialog(onClose)

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
      <div class="sheet__body">
        <header class="sheet__header">
          <h2 id="filters-dialog-title">Filtri</h2>
          <button class="icon-button" type="button" aria-label="Chiudi filtri" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <p class="hint">Le scelte si applicano subito alla lista.</p>

        {showUrgent && (
          <label class="filter-option filter-option--urgent">
            <input
              type="checkbox"
              checked={urgentOnly}
              onChange={(event) => onToggleUrgent(event.currentTarget.checked)}
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
                      checked={selectedCategories.includes(category)}
                      onChange={() => onToggleCategory(category)}
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
          <button class="button button--ghost" type="button" onClick={onClear}>
            Azzera
          </button>
          <button class="button button--primary" type="button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </dialog>
  )
}
