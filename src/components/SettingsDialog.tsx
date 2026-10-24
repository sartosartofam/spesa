import { useEffect, useRef, useState } from 'preact/hooks'
import { useModalDialog } from '../hooks/useModalDialog'
import { readCategories } from '../lib/categories'
import { isLiveData } from '../lib/data'
import {
  createFamilyInvite,
  type FamilyInvite,
  type FamilyMember,
  formatInviteExpiry,
  listFamilyMembers,
  mapInviteError,
  normalizeInviteCode,
  promoteFamilyOwner,
  type RedeemedFamily,
  redeemFamilyInvite,
} from '../lib/family'
import {
  createPreset,
  mergeImportedPresets,
  type OrderPreset,
  parsePresetImport,
  serializePresets,
  uniquePresetName,
} from '../lib/order-presets'
import { createDefaultSettings, normalizeSettings, type Settings } from '../lib/settings'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from './Icons'

interface SettingsDialogProps {
  settings: Settings
  currentUserId: string
  onClose: () => void
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ settings, currentUserId, onClose, onSave }: SettingsDialogProps) {
  const dialogRef = useModalDialog(saveAndClose)
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
  const [invite, setInvite] = useState<FamilyInvite | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [redeemedFamily, setRedeemedFamily] = useState<RedeemedFamily | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [membersLoading, setMembersLoading] = useState(isLiveData)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [promotingMemberId, setPromotingMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLiveData) return

    let cancelled = false
    setMembersLoading(true)

    listFamilyMembers()
      .then((rows) => {
        if (!cancelled) setMembers(rows)
      })
      .catch((error) => {
        if (!cancelled) setMembersError(mapInviteError(error))
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const currentUserRole = members.find((member) => member.id === currentUserId)?.role

  const activePreset =
    presets.find((preset) => preset.id === activePresetId) ??
    presets[0] ??
    createPreset('Il mio negozio', undefined, categories)
  const orderedCategories = activePreset.order.filter((category) => category !== 'Altro')

  function currentSettings(): Settings {
    return normalizeSettings(
      {
        quickAdd,
        defaultCategory,
        activePresetId,
        presets,
      },
      categories,
    )
  }

  function saveAndClose() {
    onSave(currentSettings())
    onClose()
  }

  function cancel() {
    onClose()
  }

  function resetDefaults() {
    if (
      !window.confirm(
        'Ripristinare le impostazioni predefinite? Le modifiche non ancora salvate andranno perse.',
      )
    ) {
      return
    }

    const defaults = createDefaultSettings()
    setQuickAdd(defaults.quickAdd)
    setDefaultCategory(defaults.defaultCategory)
    setPresets(defaults.presets.map((preset) => ({ ...preset, order: [...preset.order] })))
    setActivePresetId(defaults.activePresetId)
    setImportMessage(null)
    setImportError(null)
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

  async function createInvite() {
    setInviteBusy(true)
    setInviteError(null)
    setInviteMessage(null)
    setCopyMessage(null)

    try {
      const created = await createFamilyInvite()
      setInvite(created)
      setInviteMessage('Codice creato. Condividilo con la persona che vuoi invitare.')
    } catch (error) {
      setInviteError(mapInviteError(error))
    } finally {
      setInviteBusy(false)
    }
  }

  async function copyInvite() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopyMessage('Codice copiato.')
    } catch {
      setCopyMessage('Copia il codice manualmente.')
    }
  }

  async function redeemInvite() {
    const code = normalizeInviteCode(inviteCode)
    if (!code) {
      setInviteError('Inserisci un codice invito.')
      return
    }

    setInviteBusy(true)
    setInviteError(null)
    setInviteMessage(null)

    try {
      const family = await redeemFamilyInvite(code)
      setRedeemedFamily(family)
      setInviteCode('')
      setInvite(null)
      setCopyMessage(null)
    } catch (error) {
      setInviteError(mapInviteError(error))
    } finally {
      setInviteBusy(false)
    }
  }

  async function promote(memberId: string) {
    setPromotingMemberId(memberId)
    setInviteError(null)
    setMembersError(null)

    try {
      await promoteFamilyOwner(memberId)
      setMembers(await listFamilyMembers())
    } catch (error) {
      setInviteError(mapInviteError(error))
    } finally {
      setPromotingMemberId(null)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      class="sheet"
      aria-labelledby="settings-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        saveAndClose()
      }}
    >
      <form
        class="sheet__body"
        onSubmit={(event) => {
          event.preventDefault()
          saveAndClose()
        }}
      >
        <header class="sheet__header">
          <h2 id="settings-dialog-title">Impostazioni</h2>
          <button class="icon-button" type="button" aria-label="Chiudi" onClick={saveAndClose}>
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

        {isLiveData && (
          <section class="settings-section" aria-labelledby="settings-family-title">
            <h3 class="settings-section__title" id="settings-family-title">
              Famiglia
            </h3>

            {redeemedFamily ? (
              <>
                <p class="hint" role="status">
                  Ora fai parte di <strong>{redeemedFamily.familyName}</strong>. Ricarica la lista
                  per vedere i dati della nuova famiglia.
                </p>
                <button
                  class="button button--primary"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Ricarica la lista
                </button>
              </>
            ) : (
              <>
                <p class="hint">Membri della famiglia</p>

                {membersLoading ? (
                  <p class="hint" role="status">
                    Carico i membri…
                  </p>
                ) : (
                  <ul class="family-members">
                    {members.map((member) => (
                      <li class="family-members__item" key={member.id}>
                        <span class="family-members__name">
                          {member.displayName || member.email}
                          {member.id === currentUserId ? ' (tu)' : ''}
                        </span>
                        <span class="family-members__role">
                          {member.role === 'owner' ? 'owner' : 'member'}
                        </span>
                        {currentUserRole === 'owner' &&
                          member.id !== currentUserId &&
                          member.role === 'member' && (
                            <button
                              class="button button--ghost"
                              type="button"
                              disabled={promotingMemberId === member.id}
                              onClick={() => void promote(member.id)}
                            >
                              {promotingMemberId === member.id ? 'Attendi…' : 'Rendi owner'}
                            </button>
                          )}
                      </li>
                    ))}
                  </ul>
                )}

                {membersError && (
                  <p class="alert" role="alert">
                    {membersError}
                  </p>
                )}

                <p class="hint">
                  Genera un codice monouso e condividilo con la persona che vuoi invitare. Il codice
                  scade dopo 7 giorni e può essere usato una sola volta.
                </p>

                <div class="preset-toolbar">
                  <button
                    class="button button--ghost"
                    type="button"
                    disabled={inviteBusy}
                    onClick={() => void createInvite()}
                  >
                    {invite ? 'Genera un altro codice' : 'Genera codice invito'}
                  </button>
                </div>

                {invite && (
                  <>
                    <div class="field">
                      <label class="field__label" for="family-invite-code">
                        Codice invito
                      </label>
                      <input
                        id="family-invite-code"
                        type="text"
                        readOnly
                        value={invite.code}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <p class="hint">Monouso. Scade il {formatInviteExpiry(invite.expiresAt)}.</p>
                    </div>
                    <div class="preset-toolbar">
                      <button
                        class="button button--ghost"
                        type="button"
                        onClick={() => void copyInvite()}
                      >
                        Copia codice
                      </button>
                    </div>
                    {copyMessage && (
                      <p class="hint" role="status">
                        {copyMessage}
                      </p>
                    )}
                  </>
                )}

                {inviteMessage && (
                  <p class="hint" role="status">
                    {inviteMessage}
                  </p>
                )}

                <div class="field">
                  <label class="field__label" for="family-invite-input">
                    Hai ricevuto un codice?
                  </label>
                  <input
                    id="family-invite-input"
                    type="text"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck={false}
                    maxLength={32}
                    value={inviteCode}
                    onInput={(event) => setInviteCode(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void redeemInvite()
                      }
                    }}
                  />
                </div>

                <div class="preset-toolbar">
                  <button
                    class="button button--primary"
                    type="button"
                    disabled={inviteBusy}
                    onClick={() => void redeemInvite()}
                  >
                    {inviteBusy ? 'Attendi…' : 'Entra nella famiglia'}
                  </button>
                </div>

                <p class="hint">
                  Attenzione: se sei l’unico membro della famiglia attuale, entrando in un’altra
                  famiglia la famiglia e la sua lista verranno eliminate. Se sei owner con altri
                  membri, nomina prima un altro owner.
                </p>
              </>
            )}

            {inviteError && (
              <p class="alert" role="alert">
                {inviteError}
              </p>
            )}
          </section>
        )}

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

        <p class="hint">
          Le modifiche si salvano automaticamente quando chiudi. Annulla le scarta.
        </p>

        <div class="dialog-actions">
          <button class="button button--ghost" type="button" onClick={cancel}>
            Annulla
          </button>
          <button class="button button--danger-ghost" type="button" onClick={resetDefaults}>
            Ripristina impostazioni
          </button>
        </div>
      </form>
    </dialog>
  )
}
