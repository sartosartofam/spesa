import { useState } from 'preact/hooks'
import { AddItemForm } from './components/AddItemForm'
import { AppHeader } from './components/AppHeader'
import { CategorySection } from './components/CategorySection'
import { EmptyState } from './components/EmptyState'
import { ListTabs } from './components/ListTabs'
import { useShoppingList } from './hooks/useShoppingList'
import { isLiveData } from './lib/data'
import type { ListView } from './lib/types'

export function App() {
  const [view, setView] = useState<ListView>('active')
  const list = useShoppingList()

  return (
    <div class="app">
      <AppHeader isMockData={!isLiveData} />

      <main class="app__main">
        {view === 'active' && (
          <AddItemForm suggestions={list.suggestions} onAdd={(input) => list.add(input)} />
        )}

        <ListTabs view={view} counts={list.counts} onChange={setView} />

        <div class="app__feedback" role="status" aria-live="polite">
          {list.error && <p class="alert">{list.error}</p>}
          {list.loading && <p class="hint">Carico la lista…</p>}
        </div>

        {!list.loading &&
          (view === 'active' ? (
            list.counts.active === 0 ? (
              <EmptyState
                title="La lista è vuota"
                hint="Aggiungi il primo articolo qui sopra: bastano il nome e un tap."
              />
            ) : (
              <>
                <CategorySection
                  title="Da prendere subito"
                  items={list.urgent}
                  variant="active"
                  urgent
                  onStatus={list.setStatus}
                />
                {list.toBuyByCategory.map(([category, items]) => (
                  <CategorySection
                    key={category}
                    title={category}
                    items={items}
                    variant="active"
                    onStatus={list.setStatus}
                  />
                ))}
              </>
            )
          ) : list.counts.history === 0 ? (
            <EmptyState
              title="Nessun acquisto recente"
              hint="Gli articoli segnati come presi finiscono qui e si possono rimettere in lista con un tap."
            />
          ) : (
            <CategorySection
              title="Comprati di recente"
              items={list.history}
              variant="history"
              onStatus={list.setStatus}
            />
          ))}
      </main>

      <footer class="app__footer">
        <span>Fase 1 · lista della spesa</span>
        {!isLiveData && <span>Dati di prova in locale, nessun collegamento al database</span>}
      </footer>
    </div>
  )
}
