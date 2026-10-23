import { useMemo, useState } from 'preact/hooks'
import { AppHeader } from './components/AppHeader'
import { CategorySection } from './components/CategorySection'
import { EmptyState } from './components/EmptyState'
import { FiltersDialog } from './components/FiltersDialog'
import { CloseIcon, FilterIcon } from './components/Icons'
import { ItemDialog, type ItemDraft } from './components/ItemDialog'
import { ListTabs } from './components/ListTabs'
import { QuickAdd } from './components/QuickAdd'
import { SettingsDialog } from './components/SettingsDialog'
import { useShoppingList } from './hooks/useShoppingList'
import { categoryRank, normalizeCategory } from './lib/categories'
import { isLiveData } from './lib/data'
import { categoryCounts, groupByCategory, matchesQuery, sortActive, sortHistory } from './lib/list'
import { activeCategoryOrder, readSettings, type Settings, writeSettings } from './lib/settings'
import type { Item, ListView } from './lib/types'

type DialogState = { mode: 'add'; draft: Partial<ItemDraft> } | { mode: 'edit'; item: Item } | null

export function App() {
  const list = useShoppingList()
  const [view, setView] = useState<ListView>('active')
  const [query, setQuery] = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const categoryOrder = activeCategoryOrder(settings)

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

  const activeFilterCount = selectedCategories.length + (urgentOnly ? 1 : 0)
  const hasFilters = query.trim().length > 0 || activeFilterCount > 0

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

  function clearFilters() {
    setUrgentOnly(false)
    setSelectedCategories([])
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
      if (dialog.item.status === 'bought' && payload.urgent) {
        await list.setStatus(dialog.item.id, 'to_buy')
      }
    } else {
      await list.add(payload)
    }
  }

  async function handleDelete() {
    if (dialog?.mode !== 'edit') return
    await list.remove(dialog.item.id)
  }

  function handleSaveSettings(next: Settings) {
    setSettings(next)
    writeSettings(next)
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
        isMockData={!isLiveData}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div class="layout">
        <main class="app__main">
          <QuickAdd
            suggestions={list.suggestions}
            quickMode={settings.quickAdd}
            defaultCategory={settings.defaultCategory}
            onSubmit={handleQuickAdd}
            onDetails={handleQuickAddDetails}
          />

          <ListTabs view={view} counts={list.counts} onChange={changeView} />

          <div class="toolbar">
            <label class="sr-only" for="search-items">
              Cerca articoli
            </label>
            <input
              id="search-items"
              class="search"
              type="search"
              placeholder="Cerca per nome, categoria o nota…"
              value={query}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
            <button
              class="filter-button"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setFiltersOpen(true)}
            >
              <FilterIcon />
              <span>Filtri</span>
              {activeFilterCount > 0 && (
                <span class="filter-button__count">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {activeFilterCount > 0 && (
            <div class="active-filters">
              {urgentOnly && (
                <button
                  class="filter-chip filter-chip--active filter-chip--urgent"
                  type="button"
                  aria-label="Togli il filtro Solo urgenti"
                  onClick={() => setUrgentOnly(false)}
                >
                  Solo urgenti
                  <CloseIcon />
                </button>
              )}
              {selectedCategories.map((category) => (
                <button
                  class="filter-chip filter-chip--active"
                  type="button"
                  key={category}
                  aria-label={`Togli il filtro ${category}`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  <CloseIcon />
                </button>
              ))}
              <button class="link-button" type="button" onClick={clearFilters}>
                Azzera
              </button>
            </div>
          )}

          <div class="app__feedback" role="status" aria-live="polite">
            {list.error && <p class="alert">{list.error}</p>}
            {list.loading && <p class="hint">Carico la lista…</p>}
          </div>

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
                <CategorySection
                  title="Urgenti"
                  items={urgentItems}
                  variant="active"
                  urgent
                  showCategory
                  onMarkBought={(item) => list.setStatus(item.id, 'bought')}
                  onRestore={(item) => list.restore(item.id)}
                  onEdit={(item) => setDialog({ mode: 'edit', item })}
                />
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

          <section class="panel">
            <h2 class="panel__title">Filtri</h2>
            {view === 'active' && (
              <label class="filter-option filter-option--urgent">
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={(event) => setUrgentOnly(event.currentTarget.checked)}
                />
                <span>Solo urgenti</span>
                <span class="filter-option__count">{list.counts.urgent}</span>
              </label>
            )}
            <p class="field__label">Categorie</p>
            {filterCategories.length === 0 ? (
              <p class="hint">Nessuna categoria disponibile.</p>
            ) : (
              <ul class="filter-options">
                {filterCategories.map(([category, count]) => (
                  <li key={category}>
                    <label class="filter-option">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span>{category}</span>
                      <span class="filter-option__count">{count}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {activeFilterCount > 0 && (
              <button class="link-button" type="button" onClick={clearFilters}>
                Azzera filtri
              </button>
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
        <span>Spesa di famiglia</span>
        {!isLiveData && <span>modalità demo · dati locali</span>}
      </footer>

      {dialog && (
        <ItemDialog
          key={dialog.mode === 'edit' ? dialog.item.id : `add-${dialog.draft.name ?? ''}`}
          mode={dialog.mode}
          initial={dialogInitial}
          onClose={() => setDialog(null)}
          onSave={handleSave}
          onDelete={dialog.mode === 'edit' ? handleDelete : undefined}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}

      {filtersOpen && (
        <FiltersDialog
          categories={filterCategories}
          selectedCategories={selectedCategories}
          urgentOnly={urgentOnly}
          showUrgent={view === 'active'}
          onToggleUrgent={(next) => setUrgentOnly(next)}
          onToggleCategory={toggleCategory}
          onClear={clearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  )
}
