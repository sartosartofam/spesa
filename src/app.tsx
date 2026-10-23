import { useMemo, useState } from 'preact/hooks'
import { AppHeader } from './components/AppHeader'
import { CategorySection } from './components/CategorySection'
import { EmptyState } from './components/EmptyState'
import { ItemDialog, type ItemDraft } from './components/ItemDialog'
import { ListTabs } from './components/ListTabs'
import { QuickAdd } from './components/QuickAdd'
import { SettingsDialog } from './components/SettingsDialog'
import { useShoppingList } from './hooks/useShoppingList'
import { normalizeCategory } from './lib/categories'
import { isLiveData } from './lib/data'
import { groupByCategory, matchesQuery, sortActive, sortHistory } from './lib/list'
import { readSettings, type Settings, writeSettings } from './lib/settings'
import type { Item, ListView } from './lib/types'

type DialogState = { mode: 'add'; draft: Partial<ItemDraft> } | { mode: 'edit'; item: Item } | null

export function App() {
  const list = useShoppingList()
  const [view, setView] = useState<ListView>('active')
  const [query, setQuery] = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activeItems = useMemo(
    () =>
      list.active.filter(
        (item) =>
          matchesQuery(item, query) &&
          (!urgentOnly || item.urgent) &&
          (!categoryFilter || normalizeCategory(item.category) === categoryFilter),
      ),
    [list.active, query, urgentOnly, categoryFilter],
  )

  const activeGroups = useMemo(() => groupByCategory(activeItems), [activeItems])
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
            (!categoryFilter || normalizeCategory(item.category) === categoryFilter),
        ),
      ),
    [list.history, query, categoryFilter],
  )

  const hasFilters = query.trim().length > 0 || urgentOnly || categoryFilter !== null

  function changeView(next: ListView) {
    setView(next)
    if (next === 'history') setUrgentOnly(false)
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

  function openAdd(draft: Partial<ItemDraft> = {}) {
    setDialog({
      mode: 'add',
      draft: { category: settings.defaultCategory, ...draft },
    })
  }

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
            {view === 'active' && (
              <button
                class={`filter-chip ${urgentOnly ? 'filter-chip--active' : ''}`}
                type="button"
                aria-pressed={urgentOnly}
                onClick={() => setUrgentOnly((current) => !current)}
              >
                Solo urgenti
                <span>{list.counts.urgent}</span>
              </button>
            )}
            {categoryFilter && (
              <button
                class="filter-chip filter-chip--active"
                type="button"
                aria-label={`Togli il filtro ${categoryFilter}`}
                onClick={() => setCategoryFilter(null)}
              >
                {categoryFilter}
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>

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
                  onToggleUrgent={(item) => list.toggleUrgent(item)}
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
                    onToggleUrgent={(item) => list.toggleUrgent(item)}
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
                onToggleUrgent={(item) => list.toggleUrgent(item)}
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
            <h2 class="panel__title">Categorie</h2>
            {list.categories.length === 0 ? (
              <p class="hint">Nessun articolo in lista.</p>
            ) : (
              <ul class="category-list">
                {list.categories.map(([category, count]) => (
                  <li key={category}>
                    <button
                      type="button"
                      aria-pressed={categoryFilter === category}
                      onClick={() =>
                        setCategoryFilter((current) => (current === category ? null : category))
                      }
                    >
                      <span>{category}</span>
                      <span class="category-list__count">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
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

          <section class="panel">
            <h2 class="panel__title">Aggiunta</h2>
            <p class="hint">Il campo in alto apre il dialog con categoria, quantità e urgenza.</p>
            <button class="button button--ghost" type="button" onClick={() => openAdd()}>
              Aggiungi con dettagli
            </button>
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
    </div>
  )
}
