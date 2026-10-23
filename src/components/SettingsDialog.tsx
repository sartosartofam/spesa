import { useState } from 'preact/hooks'
import { useModalDialog } from '../hooks/useModalDialog'
import { normalizeCategoryOrder, readCategories } from '../lib/categories'
import type { Settings } from '../lib/settings'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from './Icons'

interface SettingsDialogProps {
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ settings, onClose, onSave }: SettingsDialogProps) {
  const dialogRef = useModalDialog(onClose)
  const [quickAdd, setQuickAdd] = useState(settings.quickAdd)
  const [defaultCategory, setDefaultCategory] = useState(settings.defaultCategory)
  const [categories] = useState<string[]>(() => readCategories())
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => settings.categoryOrder)
  const orderedCategories = categoryOrder.filter((category) => category !== 'Altro')

  function submit(event: Event) {
    event.preventDefault()
    onSave({
      quickAdd,
      defaultCategory,
      categoryOrder: normalizeCategoryOrder(categoryOrder, categories),
    })
    onClose()
  }

  function moveCategory(index: number, direction: -1 | 1) {
    setCategoryOrder((current) => {
      const next = current.filter((category) => category !== 'Altro')
      const target = index + direction
      const currentCategory = next[index]
      const targetCategory = next[target]
      if (!currentCategory || !targetCategory) return current
      next[index] = targetCategory
      next[target] = currentCategory
      return [...next, 'Altro']
    })
  }

  return (
    <dialog
      ref={dialogRef}
      class="sheet"
      aria-labelledby="settings-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form class="sheet__body" onSubmit={submit}>
        <header class="sheet__header">
          <h2 id="settings-dialog-title">Impostazioni</h2>
          <button class="icon-button" type="button" aria-label="Chiudi" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <label class="checkbox">
          <input
            type="checkbox"
            checked={quickAdd}
            onChange={(event) => setQuickAdd(event.currentTarget.checked)}
          />
          <span>
            <strong>Aggiunta rapida</strong>
            <span class="checkbox__hint">
              Il campo in alto aggiunge subito, senza chiedere categoria e urgenza.
            </span>
          </span>
        </label>

        <div class="field">
          <label class="field__label" for="settings-category">
            Categoria predefinita
          </label>
          <select
            id="settings-category"
            value={defaultCategory}
            onChange={(event) => setDefaultCategory(event.currentTarget.value)}
          >
            {!categories.includes(defaultCategory) && (
              <option value={defaultCategory}>{defaultCategory}</option>
            )}
            {categories.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
          <p class="hint">Usata dall'aggiunta rapida e come proposta nel dialog.</p>
        </div>

        <div class="field">
          <span class="field__label">Percorso negozio</span>
          <p class="hint">
            Ordina le categorie come le incontri nel tuo supermercato. La lista segue questo ordine;
            “Altro” resta in fondo.
          </p>
          <ul class="order-list">
            {orderedCategories.map((category, index) => (
              <li class="order-list__item" key={category}>
                <span>{category}</span>
                <span class="order-list__actions">
                  <button
                    class="icon-button icon-button--small"
                    type="button"
                    aria-label={`Sposta ${category} prima`}
                    disabled={index === 0}
                    onClick={() => moveCategory(index, -1)}
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    class="icon-button icon-button--small"
                    type="button"
                    aria-label={`Sposta ${category} dopo`}
                    disabled={index === orderedCategories.length - 1}
                    onClick={() => moveCategory(index, 1)}
                  >
                    <ChevronDownIcon />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div class="dialog-actions">
          <button class="button button--ghost" type="button" onClick={onClose}>
            Annulla
          </button>
          <button class="button button--primary" type="submit">
            Salva
          </button>
        </div>
      </form>
    </dialog>
  )
}
