import { useRef, useState } from 'preact/hooks'
import { useModalDialog } from '../hooks/useModalDialog'
import { readCategories } from '../lib/categories'
import {
  createPreset,
  mergeImportedPresets,
  type OrderPreset,
  parsePresetImport,
  serializePresets,
  uniquePresetName,
} from '../lib/order-presets'
import { normalizeSettings, type Settings } from '../lib/settings'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from './Icons'

interface SettingsDialogProps {
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ settings, onClose, onSave }: SettingsDialogProps) {
  const dialogRef = useModalDialog(onClose)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [quickAdd, setQuickAdd] = useState(settings.quickAdd)
  const [defaultCategory, setDefaultCategory] = useState(settings.defaultCategory)
  const [categories] = useState<string[]>(() => readCategories())
  const [presets, setPresets] = useState<OrderPreset[]>(() =>
    settings.presets.map((preset) => ({ ...preset, order: [...preset.order] })),
  )
  const [activePresetId, setActivePresetId] = useState(settings.activePresetId)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const activePreset =
    presets.find((preset) => preset.id === activePresetId) ??
    presets[0] ??
    createPreset('Il mio negozio', undefined, categories)
  const orderedCategories = activePreset.order.filter((category) => category !== 'Altro')

  function submit(event: Event) {
    event.preventDefault()
    onSave(
      normalizeSettings(
        {
          quickAdd,
          defaultCategory,
          activePresetId,
          presets,
        },
        categories,
      ),
    )
    onClose()
  }

  function updateActivePreset(patch: Partial<Pick<OrderPreset, 'name' | 'order'>>) {
    setPresets((current) =>
      current.map((preset) => (preset.id === activePreset.id ? { ...preset, ...patch } : preset)),
    )
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const next = [...orderedCategories]
    const target = index + direction
    const currentCategory = next[index]
    const targetCategory = next[target]
    if (!currentCategory || !targetCategory) return
    next[index] = targetCategory
    next[target] = currentCategory
    updateActivePreset({ order: [...next, 'Altro'] })
  }

  function addPreset() {
    const name = uniquePresetName('Nuovo negozio', presets)
    const preset = createPreset(name, activePreset.order, categories)
    setPresets((current) => [...current, preset])
    setActivePresetId(preset.id)
    setImportMessage(null)
    setImportError(null)
  }

  function deletePreset() {
    if (presets.length <= 1) return
    if (!window.confirm(`Eliminare il preset “${activePreset.name}”?`)) return
    const remaining = presets.filter((preset) => preset.id !== activePreset.id)
    setPresets(remaining)
    setActivePresetId(remaining[0]?.id ?? 'default')
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    setImportMessage(null)
    setImportError(null)

    try {
      const result = parsePresetImport(await file.text(), file.name, categories)
      const merged = mergeImportedPresets(presets, result.presets)
      setPresets(merged.presets)
      setActivePresetId(merged.activePresetId)

      const details = [
        merged.added > 0 ? `${merged.added} aggiunti` : '',
        merged.updated > 0 ? `${merged.updated} aggiornati` : '',
      ].filter(Boolean)
      setImportMessage(`Preset importati${details.length > 0 ? `: ${details.join(', ')}` : ''}.`)
      if (result.warnings.length > 0) setImportError(result.warnings.join(' '))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import non riuscito.')
    }
  }

  function exportPresets() {
    const blob = new Blob([serializePresets(presets)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'spesa-preset-negozi.json'
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
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

        <section class="settings-section">
          <h3 class="settings-section__title">Aggiunta</h3>

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
        </section>

        <section class="settings-section">
          <h3 class="settings-section__title">Percorso negozio</h3>
          <p class="hint">
            Crea un preset per ogni supermercato e ordina le categorie come le incontri. La lista
            segue il preset attivo; “Altro” resta in fondo.
          </p>

          <div class="preset-toolbar">
            <div class="field field--grow">
              <label class="field__label" for="preset-select">
                Preset
              </label>
              <select
                id="preset-select"
                value={activePreset.id}
                onChange={(event) => setActivePresetId(event.currentTarget.value)}
              >
                {presets.map((preset) => (
                  <option value={preset.id} key={preset.id}>
                    {preset.name.trim() || 'Preset senza nome'}
                  </option>
                ))}
              </select>
            </div>
            <div class="preset-toolbar__actions">
              <button class="button button--ghost" type="button" onClick={addPreset}>
                Nuovo
              </button>
              <button
                class="button button--danger-ghost"
                type="button"
                disabled={presets.length <= 1}
                onClick={deletePreset}
              >
                Elimina
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field__label" for="preset-name">
              Nome preset
            </label>
            <input
              id="preset-name"
              type="text"
              value={activePreset.name}
              onInput={(event) => updateActivePreset({ name: event.currentTarget.value })}
            />
          </div>

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

          <div class="preset-toolbar">
            <button
              class="button button--ghost"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Importa JSON/CSV
            </button>
            <button class="button button--ghost" type="button" onClick={exportPresets}>
              Esporta JSON
            </button>
            <input
              ref={fileInputRef}
              class="sr-only"
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={importFile}
            />
          </div>

          <p class="hint">
            CSV: una riga per categoria, colonne <code>preset,categoria</code> oppure solo{' '}
            <code>categoria</code>. JSON: <code>{'{ "name": "...", "order": [...] }'}</code> o un
            array di preset.
          </p>
          {importMessage && (
            <p class="hint" role="status">
              {importMessage}
            </p>
          )}
          {importError && (
            <p class="alert" role="alert">
              {importError}
            </p>
          )}
          <p class="hint">
            Per ora i preset restano su questo dispositivo. La condivisione con la famiglia arriverà
            con la sincronizzazione.
          </p>
        </section>

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
