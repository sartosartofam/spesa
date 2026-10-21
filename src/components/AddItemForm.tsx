import { useState } from 'preact/hooks'
import { CATEGORY_OPTIONS } from '../lib/data/mock-repository'

interface AddItemFormProps {
  suggestions: string[]
  onAdd: (input: { name: string; category: string }) => void | Promise<void>
}

export function AddItemForm({ suggestions, onAdd }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0])

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0

  async function submit(event: Event) {
    event.preventDefault()
    if (!canSubmit) return
    await onAdd({ name: trimmed, category })
    setName('')
  }

  return (
    <form class="add-form" onSubmit={submit} autocomplete="off">
      <label class="sr-only" for="item-name">
        Nuovo articolo
      </label>
      <div class="add-form__row">
        <input
          id="item-name"
          class="add-form__input"
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
        <button class="button button--primary add-form__submit" type="submit" disabled={!canSubmit}>
          Aggiungi
        </button>
      </div>
      <div class="add-form__row add-form__row--meta">
        <label class="sr-only" for="item-category">
          Categoria
        </label>
        <select
          id="item-category"
          class="add-form__select"
          value={category}
          onChange={(event) => setCategory(event.currentTarget.value)}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </form>
  )
}
