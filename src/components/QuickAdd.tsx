import { useState } from 'preact/hooks'

interface QuickAddProps {
  suggestions: string[]
  quickMode: boolean
  defaultCategory: string
  /** Restituisce `false` se l'aggiunta è fallita: il testo resta nel campo. */
  onSubmit: (name: string) => Promise<boolean>
  onDetails: (name: string) => void
}

export function QuickAdd({
  suggestions,
  quickMode,
  defaultCategory,
  onSubmit,
  onDetails,
}: QuickAddProps) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0

  async function submit(event: Event) {
    event.preventDefault()
    if (!canSubmit) return
    const succeeded = await onSubmit(trimmed)
    // In caso di errore il nome resta nel campo, così si può riprovare subito.
    if (succeeded !== false) setName('')
  }

  return (
    <form class="quick-add" onSubmit={submit} autocomplete="off">
      <div class="quick-add__inner">
        <div class="quick-add__field">
          <label class="sr-only" for="quick-add-name">
            Nuovo articolo
          </label>
          <input
            id="quick-add-name"
            class="quick-add__input"
            type="text"
            name="name"
            placeholder="Aggiungi articolo"
            list="item-suggestions"
            value={name}
            maxLength={80}
            enterKeyHint="done"
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </div>
        <datalist id="item-suggestions">
          {suggestions.map((suggestion) => (
            <option value={suggestion} key={suggestion} />
          ))}
        </datalist>
        <button
          class="button button--primary quick-add__submit"
          type="submit"
          disabled={!canSubmit}
        >
          Aggiungi
        </button>
      </div>
      {quickMode && (
        <p class="quick-add__hint">
          Aggiunta rapida in <strong>{defaultCategory}</strong>
          <span aria-hidden="true"> · </span>
          <button class="link-button" type="button" onClick={() => onDetails(trimmed)}>
            Dettagli
          </button>
        </p>
      )}
    </form>
  )
}
