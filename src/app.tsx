import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { AppHeader } from './components/AppHeader'
import { CategorySection } from './components/CategorySection'
import { EmptyState } from './components/EmptyState'
import { ChevronDownIcon, CloseIcon } from './components/Icons'
import { ItemDialog, type ItemDraft } from './components/ItemDialog'
import { ListTabs } from './components/ListTabs'
import { QuickAdd } from './components/QuickAdd'
import { SettingsDialog } from './components/SettingsDialog'
import { useFamilyPeople } from './hooks/useFamilyPeople'
import { useShoppingList } from './hooks/useShoppingList'
import {
  type AccountSettings,
  loadAccountSettings,
  localAccountSettings,
  mapAccountSettingsError,
  mergeAccountSettings,
  saveAccountSettings,
  writeCachedAccountSettings,
} from './lib/account-settings'
import {
  appendCustomCategory,
  categoriesFromCustom,
  categoryRank,
  cleanCategoryName,
  normalizeCategory,
  writeCustomCategories,
} from './lib/categories'
import { isLiveData } from './lib/data'
import { familyDisplayName } from './lib/family'
import { writeLandingGlow } from './lib/landing-glow'
import { categoryCounts, groupByCategory, matchesQuery, sortActive, sortHistory } from './lib/list'
import {
  activeCategoryOrder,
  normalizeSettings,
  type Settings,
  writeSettings,
} from './lib/settings'
import { applyTheme } from './lib/theme'
import type { Item, ListView } from './lib/types'

type DialogState = { mode: 'add'; draft: Partial<ItemDraft> } | { mode: 'edit'; item: Item } | null

interface AppProps {
  userName: string
  userId: string
  familyId: string | null
  familyName: string | null
  onFamilyRenamed: (name: string) => void
  authError: string | null
  onLogout: () => void
}

export function App({
  userName,
  userId,
  familyId,
  familyName,
  onFamilyRenamed,
  authError,
  onLogout,
}: AppProps) {
  const list = useShoppingList()
  const people = useFamilyPeople(userId, userName, familyId)
  const [view, setView] = useState<ListView>('active')
  const [controlsOpen, setControlsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [account, setAccount] = useState<AccountSettings>(() => localAccountSettings(userId))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSyncError, setSettingsSyncError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const settingsTouched = useRef(false)
  const settings = account.settings
  const categories = useMemo(
    () => categoriesFromCustom(account.customCategories),
    [account.customCategories],
  )
  const categoryOrder = activeCategoryOrder(settings)

  // Carica le impostazioni dell'account dopo il login. I dati locali restano
  // visibili finché la sync non risponde e servono a seminare una riga mancante.
  useEffect(() => {
    let cancelled = false
    settingsTouched.current = false
    const local = localAccountSettings(userId)
    setAccount(local)
    setSettingsSyncError(null)

    if (!isLiveData) return

    void loadAccountSettings(userId)
      .then(async (remote) => {
        if (cancelled || settingsTouched.current) return
        const next = mergeAccountSettings(remote, local)
        setAccount(next)
        writeCachedAccountSettings(userId, next)
        if (remote) return

        try {
          await saveAccountSettings(userId, next)
        } catch (error) {
          if (!cancelled) setSettingsSyncError(mapAccountSettingsError(error))
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettingsSyncError(mapAccountSettingsError(error))
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useLayoutEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    return () => applyTheme('auto')
  }, [])

  function persistAccount(next: AccountSettings) {
    settingsTouched.current = true
    setAccount(next)
    writeCachedAccountSettings(userId, next)

    if (!isLiveData) {
      writeSettings(next.settings)
      writeCustomCategories(next.customCategories)
      return
    }

    void saveAccountSettings(userId, next)
      .then(() => setSettingsSyncError(null))
      .catch((error: unknown) => setSettingsSyncError(mapAccountSettingsError(error)))
  }

  const categoryFilter = useMemo(() => new Set(selectedCategories), [selectedCategories])
  const activeItems = useMemo(
    () =>
      list.active.filter(
        (item) =>
          matchesQuery(item, query) &&
          (!urgentOnly || item.urgent) &&
          (categoryFilter.size === 0 || categoryFilter.has(normalizeCategory(item.category))),
      ),
    [list.active, query, urgentOnly, categoryFilter],
  )

  const activeGroups = useMemo(
    () => groupByCategory(activeItems, categoryOrder),
    [activeItems, categoryOrder],
  )
  const urgentItems = useMemo(
    () => sortActive(activeItems.filter((item) => item.urgent)),
    [activeItems],
  )
  const urgentGroups = useMemo(
    () => groupByCategory(urgentItems, categoryOrder),
    [urgentItems, categoryOrder],
  )
  const historyItems = useMemo(
    () =>
      sortHistory(
        list.history.filter(
          (item) =>
            matchesQuery(item, query) &&
            (categoryFilter.size === 0 || categoryFilter.has(normalizeCategory(item.category))),
        ),
      ),
    [list.history, query, categoryFilter],
  )

  const filterCategories = useMemo(() => {
    const source = view === 'active' ? list.active : list.history
    const counts = new Map(categoryCounts(source, categoryOrder))
    for (const category of selectedCategories) {
      if (!counts.has(category)) counts.set(category, 0)
    }
    return [...counts.entries()].sort(
      ([a], [b]) =>
        categoryRank(a, categoryOrder) - categoryRank(b, categoryOrder) || a.localeCompare(b, 'it'),
    )
  }, [view, list.active, list.history, selectedCategories, categoryOrder])

  const hasFilters = query.trim().length > 0 || selectedCategories.length > 0 || urgentOnly
  const hasSidebarFilters = selectedCategories.length > 0 || urgentOnly

  function changeView(next: ListView) {
    setView(next)
    if (next === 'history') setUrgentOnly(false)
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((candidate) => candidate !== category)
        : [...current, category],
    )
  }

  function selectCategory(category: string) {
    setSelectedCategories((current) =>
      current.length === 1 && current[0] === category ? [] : [category],
    )
  }

  function clearFilters() {
    setSelectedCategories([])
    setUrgentOnly(false)
  }

  async function handleQuickAdd(name: string) {
    if (settings.quickAdd) {
      await list.add({ name, category: settings.defaultCategory })
      return
    }
    setDialog({
      mode: 'add',
      draft: { name, category: settings.defaultCategory },
    })
  }

  function handleQuickAddDetails(name: string) {
    setDialog({
      mode: 'add',
      draft: { name, category: settings.defaultCategory },
    })
  }

  async function handleSave(draft: ItemDraft) {
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      quantity: draft.quantity.trim() || null,
      note: draft.note.trim() || null,
      urgent: draft.urgent,
    }
    if (dialog?.mode === 'edit') {
      await list.update(dialog.item.id, payload)
    } else {
      await list.add(payload)
    }
  }

  async function handleDelete() {
    if (dialog?.mode !== 'edit') return
    await list.remove(dialog.item.id)
  }

  async function handleUndo() {
    const label = await list.undo()
    if (label) setToast({ id: Date.now(), message: `Annullato: ${label}` })
  }

  async function handleRedo() {
    const label = await list.redo()
    if (label) setToast({ id: Date.now(), message: `Ripetuto: ${label}` })
  }

  function handleSaveSettings(next: Settings) {
    if (next.landingGlow !== settings.landingGlow) {
      writeLandingGlow(next.landingGlow)
    }
    persistAccount({ settings: next, customCategories: account.customCategories })
  }

  /**
   * Crea una categoria personalizzata e la salva subito, anche se l'articolo
   * viene poi annullato. Restituisce il nome canonico per il select.
   */
  function handleAddCategory(value: string): string | null {
    const requested = cleanCategoryName(value)
    if (!requested) return null

    const customCategories = appendCustomCategory(account.customCategories, requested)
    const nextCategories = categoriesFromCustom(customCategories)
    const canonical = nextCategories.find(
      (category) => category.toLowerCase() === requested.toLowerCase(),
    )
    if (!canonical) return null

    const changed = customCategories.length !== account.customCategories.length
    if (changed) {
      persistAccount({
        settings: normalizeSettings(account.settings, nextCategories),
        customCategories,
      })
    }
    return canonical
  }

  const dialogInitial: Partial<ItemDraft> =
    dialog?.mode === 'edit'
      ? {
          name: dialog.item.name,
          quantity: dialog.item.quantity ?? '',
          category: normalizeCategory(dialog.item.category),
          note: dialog.item.note ?? '',
          urgent: dialog.item.urgent,
        }
      : (dialog?.draft ?? {})

  return (
    <div class="app">
      <AppHeader
        counts={list.counts}
        people={people}
        canUndo={list.canUndo}
        canRedo={list.canRedo}
        undoLabel={list.undoLabel}
        redoLabel={list.redoLabel}
        historyBusy={list.historyBusy}
        onUndo={() => void handleUndo()}
        onRedo={() => void handleRedo()}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={onLogout}
      />

      <div class="layout">
        <main class="app__main">
          <div class={`mobile-controls ${controlsOpen ? 'mobile-controls--open' : ''}`}>
            <button
              class="mobile-controls__toggle"
              type="button"
              aria-expanded={controlsOpen}
              aria-controls="mobile-controls-body"
              onClick={() => setControlsOpen((current) => !current)}
            >
              <span>{controlsOpen ? 'Nascondi controlli' : 'Aggiungi e filtra'}</span>
              <ChevronDownIcon />
            </button>

            <div id="mobile-controls-body" class="mobile-controls__body">
              <ListTabs view={view} counts={list.counts} onChange={changeView} />

              <QuickAdd
                suggestions={list.suggestions}
                quickMode={settings.quickAdd}
                defaultCategory={settings.defaultCategory}
                onSubmit={handleQuickAdd}
                onDetails={handleQuickAddDetails}
              />

              {filterCategories.length > 0 && (
                <fieldset class="category-chips">
                  <legend class="sr-only">Filtra per categoria</legend>
                  <button
                    class={`category-chip ${
                      selectedCategories.length === 0 ? 'category-chip--active' : ''
                    }`}
                    type="button"
                    aria-pressed={selectedCategories.length === 0}
                    onClick={() => setSelectedCategories([])}
                  >
                    Tutte
                  </button>
                  {filterCategories.map(([category, count]) => (
                    <button
                      class={`category-chip ${
                        selectedCategories.length === 1 && selectedCategories[0] === category
                          ? 'category-chip--active'
                          : ''
                      }`}
                      type="button"
                      key={category}
                      aria-label={`${category}, ${count} ${count === 1 ? 'articolo' : 'articoli'}`}
                      aria-pressed={
                        selectedCategories.length === 1 && selectedCategories[0] === category
                      }
                      onClick={() => selectCategory(category)}
                    >
                      {category}
                      <span class="category-chip__count" aria-hidden="true">
                        {count}
                      </span>
                    </button>
                  ))}
                </fieldset>
              )}

              <div class="toolbar">
                <label class="sr-only" for="search-items">
                  Cerca articoli
                </label>
                <input
                  id="search-items"
                  class="search"
                  type="search"
                  placeholder="Cerca per nome o categoria"
                  value={query}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                />
              </div>
            </div>
          </div>

          {urgentOnly && (
            <div class="active-filters">
              <button
                class="filter-chip filter-chip--active filter-chip--urgent"
                type="button"
                aria-label="Togli il filtro Solo urgenti"
                onClick={() => setUrgentOnly(false)}
              >
                Solo urgenti
                <CloseIcon />
              </button>
            </div>
          )}

          <div class="app__feedback" role="status" aria-live="polite">
            {authError && (
              <p class="alert" role="alert">
                {authError}
              </p>
            )}
            {list.error && <p class="alert">{list.error}</p>}
            {settingsSyncError && (
              <p class="alert" role="status">
                {settingsSyncError}
              </p>
            )}
            {list.loading && <p class="hint">Carico la lista…</p>}
          </div>

          {!list.loading && view === 'active' && !urgentOnly && urgentItems.length > 0 && (
            <div class="urgent-banner">
              <span class="urgent-banner__dot" aria-hidden="true" />
              <div class="urgent-banner__text">
                <strong>
                  {urgentItems[0]?.name}
                  {urgentItems.length > 1 ? ` + ${urgentItems.length - 1}` : ''}
                </strong>
                <small>
                  {urgentItems.length === 1
                    ? 'Segnalato urgente'
                    : `${urgentItems.length} articoli urgenti`}
                </small>
              </div>
              <button
                class="urgent-banner__action"
                type="button"
                aria-label="Mostra urgenti"
                onClick={() => setUrgentOnly(true)}
              >
                Mostra
              </button>
            </div>
          )}

          {!list.loading &&
            (view === 'active' ? (
              list.counts.active === 0 ? (
                <EmptyState
                  title="Lista vuota"
                  hint="Aggiungi il primo articolo: ti chiediamo categoria, quantità e se è urgente."
                />
              ) : activeItems.length === 0 ? (
                <EmptyState
                  title="Nessun risultato"
                  hint={
                    hasFilters
                      ? 'Prova a togliere i filtri o a cambiare la ricerca.'
                      : 'Non ci sono articoli da prendere.'
                  }
                />
              ) : urgentOnly ? (
                urgentGroups.map(([category, items]) => (
                  <CategorySection
                    key={category}
                    title={category}
                    items={items}
                    variant="active"
                    onMarkBought={(item) => list.setStatus(item.id, 'bought')}
                    onRestore={(item) => list.restore(item.id)}
                    onEdit={(item) => setDialog({ mode: 'edit', item })}
                  />
                ))
              ) : (
                activeGroups.map(([category, items]) => (
                  <CategorySection
                    key={category}
                    title={category}
                    items={items}
                    variant="active"
                    onMarkBought={(item) => list.setStatus(item.id, 'bought')}
                    onRestore={(item) => list.restore(item.id)}
                    onEdit={(item) => setDialog({ mode: 'edit', item })}
                  />
                ))
              )
            ) : list.counts.history === 0 ? (
              <EmptyState
                title="Storico vuoto"
                hint="Gli articoli presi finiscono qui: puoi rimetterli in lista quando serve."
              />
            ) : historyItems.length === 0 ? (
              <EmptyState
                title="Nessun risultato"
                hint="Prova a togliere i filtri o a cambiare la ricerca."
              />
            ) : (
              <CategorySection
                title="Presi di recente"
                items={historyItems}
                variant="history"
                showCategory
                onMarkBought={(item) => list.setStatus(item.id, 'bought')}
                onRestore={(item) => list.restore(item.id)}
                onEdit={(item) => setDialog({ mode: 'edit', item })}
              />
            ))}
        </main>

        <aside class="sidebar" aria-label="Riepilogo e controlli">
          <section class="panel">
            <h2 class="panel__title">Riepilogo</h2>
            <dl class="stats">
              <div>
                <dt>Da prendere</dt>
                <dd>{list.counts.active}</dd>
              </div>
              <div class="stats__urgent">
                <dt>Urgenti</dt>
                <dd>{list.counts.urgent}</dd>
              </div>
              <div>
                <dt>Storico</dt>
                <dd>{list.counts.history}</dd>
              </div>
            </dl>
          </section>

          <section class="panel" aria-labelledby="sidebar-filters-title">
            <div class="panel__head">
              <h2 id="sidebar-filters-title" class="panel__title">
                Filtri
              </h2>
              {hasSidebarFilters && (
                <button class="panel__action" type="button" onClick={clearFilters}>
                  Azzera filtri
                </button>
              )}
            </div>

            {view === 'active' && (
              <label
                class={`filter-option filter-option--urgent ${
                  urgentOnly ? 'filter-option--active' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={(event) => setUrgentOnly(event.currentTarget.checked)}
                />
                <span class="filter-option__label">Solo urgenti</span>
                <span class="filter-option__count">{list.counts.urgent}</span>
              </label>
            )}

            {filterCategories.length > 0 && (
              <fieldset class="filter-options">
                <legend class="sr-only">Categorie</legend>
                {filterCategories.map(([category, count]) => {
                  const active = selectedCategories.includes(category)
                  return (
                    <label
                      class={`filter-option ${active ? 'filter-option--active' : ''}`}
                      key={category}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleCategory(category)}
                      />
                      <span class="filter-option__label">{category}</span>
                      <span class="filter-option__count">{count}</span>
                    </label>
                  )
                })}
              </fieldset>
            )}
          </section>

          <section class="panel">
            <h2 class="panel__title">Urgenti</h2>
            {list.urgent.length === 0 ? (
              <p class="hint">Nessuna urgenza segnalata.</p>
            ) : (
              <ul class="urgent-list">
                {list.urgent.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: 'edit', item })}
                      aria-label={`Modifica ${item.name}`}
                    >
                      <span class="urgent-list__name">{item.name}</span>
                      {item.quantity && <span class="urgent-list__qty">{item.quantity}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <footer class="app__footer">
        <span>{familyDisplayName(familyName)}</span>
        <span class="app__footer-meta">
          {!isLiveData && <span>modalità demo · dati locali</span>}
        </span>
      </footer>

      {toast && (
        <div class="toast" role="status" aria-live="polite" aria-atomic="true" key={toast.id}>
          <span class="toast__message">{toast.message}</span>
          <button
            class="toast__close"
            type="button"
            aria-label="Chiudi avviso"
            onClick={() => setToast(null)}
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {dialog && (
        <ItemDialog
          key={dialog.mode === 'edit' ? dialog.item.id : `add-${dialog.draft.name ?? ''}`}
          mode={dialog.mode}
          initial={dialogInitial}
          categories={categories}
          onAddCategory={handleAddCategory}
          onClose={() => setDialog(null)}
          onSave={handleSave}
          onDelete={dialog.mode === 'edit' ? handleDelete : undefined}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          categories={categories}
          currentUserId={userId}
          familyId={familyId}
          familyName={familyName}
          onFamilyRenamed={onFamilyRenamed}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}
