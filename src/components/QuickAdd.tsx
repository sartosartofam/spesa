import { useState } from 'preact/hooks'

interface QuickAddProps {
  suggestions: string[]
  quickMode: boolean
  defaultCategory: string
  onSubmit: (name: string) => void | Promise<void>
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
    await onSubmit(trimmed)
    setName('')
  }

  return (
    <form class="quick-add" onSubmit={submit} autocomplete="off">
      <div class="quick-add__inner">
        <label class="sr-only" for="quick-add-name">
          Nuovo articolo
        </label>
        <input
          id="quick-add-name"
          class="quick-add__input"
          type="text"
          name="name"
          placeholder="Che cosa manca?"
          list="item-suggestions"
          value={name}
          maxLength={80}
          enterKeyHint="done"
          onInput={(event) => setName(event.currentTarget.value)}
        />
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
          Aggiunta rapida in <strong>{defaultCategory}</strong> ·{' '}
          <button class="link-button" type="button" onClick={() => onDetails(trimmed)}>
            Dettagli
          </button>
        </p>
      )}
    </form>
  )
}
