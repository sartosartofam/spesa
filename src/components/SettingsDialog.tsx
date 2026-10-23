import { useEffect, useRef, useState } from 'preact/hooks'
import { CATEGORIES, type Category } from '../lib/categories'
import type { Settings } from '../lib/settings'

interface SettingsDialogProps {
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ settings, onClose, onSave }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [quickAdd, setQuickAdd] = useState(settings.quickAdd)
  const [defaultCategory, setDefaultCategory] = useState<Category>(settings.defaultCategory)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function submit(event: Event) {
    event.preventDefault()
    onSave({ quickAdd, defaultCategory })
    onClose()
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
            ×
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
            onChange={(event) => setDefaultCategory(event.currentTarget.value as Category)}
          >
            {CATEGORIES.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
          <p class="hint">Usata dall'aggiunta rapida e come proposta nel dialog.</p>
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
