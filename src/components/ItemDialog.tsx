import { useEffect, useRef, useState } from 'preact/hooks'
import { CATEGORIES, type Category, normalizeCategory } from '../lib/categories'

export interface ItemDraft {
  name: string
  quantity: string
  category: string
  note: string
  urgent: boolean
}

interface ItemDialogProps {
  mode: 'add' | 'edit'
  initial: Partial<ItemDraft>
  onClose: () => void
  onSave: (draft: ItemDraft) => void | Promise<void>
  onDelete?: (() => void | Promise<void>) | undefined
}

const QUANTITY_HINTS = ['pz', 'pacchi', 'kg', 'g', 'l', 'bottiglie', 'confezioni', 'scatolette']

export function ItemDialog({ mode, initial, onClose, onSave, onDelete }: ItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<ItemDraft>({
    name: initial.name ?? '',
    quantity: initial.quantity ?? '',
    category: normalizeCategory(initial.category),
    note: initial.note ?? '',
    urgent: initial.urgent ?? false,
  })

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function patch<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: Event) {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) return
    await onSave({ ...draft, name })
    onClose()
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm(`Rimuovere "${draft.name}"?`)) return
    await onDelete()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      class="sheet"
      aria-labelledby="item-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form class="sheet__body" onSubmit={submit} autocomplete="off">
        <header class="sheet__header">
          <h2 id="item-dialog-title">
            {mode === 'add' ? 'Aggiungi articolo' : 'Modifica articolo'}
          </h2>
          <button class="icon-button" type="button" aria-label="Chiudi" onClick={onClose}>
            ×
          </button>
        </header>

        <div class="field">
          <label class="field__label" for="item-dialog-name">
            Nome
          </label>
          <input
            id="item-dialog-name"
            type="text"
            value={draft.name}
            maxLength={80}
            required
            autoFocus
            onInput={(event) => patch('name', event.currentTarget.value)}
          />
        </div>

        <div class="field__row">
          <div class="field">
            <label class="field__label" for="item-dialog-quantity">
              Quantità
            </label>
            <input
              id="item-dialog-quantity"
              type="text"
              value={draft.quantity}
              placeholder="es. 2 pacchi"
              maxLength={40}
              list="quantity-hints"
              onInput={(event) => patch('quantity', event.currentTarget.value)}
            />
            <datalist id="quantity-hints">
              {QUANTITY_HINTS.map((hint) => (
                <option value={hint} key={hint} />
              ))}
            </datalist>
          </div>

          <div class="field">
            <label class="field__label" for="item-dialog-category">
              Categoria
            </label>
            <select
              id="item-dialog-category"
              value={draft.category}
              onChange={(event) => patch('category', event.currentTarget.value)}
            >
              {!CATEGORIES.includes(draft.category as Category) && (
                <option value={draft.category}>{draft.category}</option>
              )}
              {CATEGORIES.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label class="checkbox">
          <input
            type="checkbox"
            checked={draft.urgent}
            onChange={(event) => patch('urgent', event.currentTarget.checked)}
          />
          <span>
            <strong>È finito</strong>
            <span class="checkbox__hint">Segnala come urgente, in cima alla lista.</span>
          </span>
        </label>

        <div class="field">
          <label class="field__label" for="item-dialog-note">
            Nota (facoltativa)
          </label>
          <input
            id="item-dialog-note"
            type="text"
            value={draft.note}
            placeholder="es. marca, formato, reparto"
            maxLength={120}
            onInput={(event) => patch('note', event.currentTarget.value)}
          />
        </div>

        {mode === 'edit' && onDelete && (
          <button class="button button--danger-ghost" type="button" onClick={handleDelete}>
            Rimuovi articolo
          </button>
        )}

        <div class="dialog-actions">
          <button class="button button--ghost" type="button" onClick={onClose}>
            Annulla
          </button>
          <button class="button button--primary" type="submit" disabled={!draft.name.trim()}>
            Salva
          </button>
        </div>
      </form>
    </dialog>
  )
}
