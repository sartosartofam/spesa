import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import {
  ADMIN_COUNT_KEYS,
  type AdminCounts,
  type AdminOverview,
  checkIsAdmin,
  describePingAge,
  fetchAdminOverview,
  formatAdminTimestamp,
  mapAdminError,
} from '../lib/admin'
import { isLiveData } from '../lib/data'
import { navigate } from '../lib/routes'
import { NotFoundPage } from './NotFoundPage'

/**
 * Pannello admin, fetta 1: salute del progetto in sola lettura.
 *
 * La pagina non è linkata da nessuna vista e vive in un chunk separato. Chi
 * non è admin non deve nemmeno sapere che esiste: la UI mostra `NotFoundPage`
 * e i dati li nega comunque `admin_overview()` (42501). Nessun realtime,
 * nessun polling: solo il pulsante **Aggiorna**.
 */

type AdminState =
  | { phase: 'loading' }
  | { phase: 'denied' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; overview: AdminOverview }

const COUNT_LABELS: Record<keyof AdminCounts, string> = {
  families: 'Famiglie',
  members: 'Membri',
  itemsToBuy: 'Articoli in lista',
  itemsBought: 'Articoli nello storico',
  pushSubscriptions: 'Subscription push',
  invitesActive: 'Inviti attivi',
  invitesUsed: 'Inviti usati',
  invitesExpired: 'Inviti scaduti',
  rateLimits: 'Righe rate limit',
}

/** Un conteggio assente resta visibile come cella vuota, non come zero. */
function countValue(value: number | null): string {
  return value === null ? '—' : String(value)
}

function AdminShell({ children }: { children: ComponentChildren }) {
  return (
    <div class="admin-page">
      <main class="admin" aria-labelledby="admin-title">
        <header class="admin__head">
          <p class="landing__eyebrow">Admin</p>
          <h1 id="admin-title">Salute del progetto</h1>
          <p class="hint">
            Sola lettura. I dati si aggiornano solo con <strong>Aggiorna</strong>: nessun realtime,
            nessun polling.
          </p>
        </header>
        {children}
      </main>
    </div>
  )
}

function DemoNotice() {
  return (
    <AdminShell>
      <section class="admin-card" aria-labelledby="admin-demo-title">
        <h2 id="admin-demo-title">Modalità demo</h2>
        <p class="hint">
          Il pannello legge solo gli aggregati del database Supabase. Con i dati demo salvati in
          questo dispositivo non c’è nulla da monitorare.
        </p>
        <button
          class="button button--primary"
          type="button"
          onClick={() => {
            navigate('/app')
          }}
        >
          Apri la lista
        </button>
      </section>
    </AdminShell>
  )
}

function AdminOverviewView({
  overview,
  onRefresh,
}: {
  overview: AdminOverview
  onRefresh: () => void
}) {
  return (
    <AdminShell>
      <div class="admin__actions">
        <button class="button button--primary" type="button" onClick={onRefresh}>
          Aggiorna
        </button>
      </div>

      <div class="admin__grid">
        <section class="admin-card" aria-labelledby="admin-keepalive-title">
          <h2 id="admin-keepalive-title">Keepalive</h2>
          <p class="admin-card__value">{describePingAge(overview.keepaliveLastPing)}</p>
          <p class="hint">Ultimo ping: {formatAdminTimestamp(overview.keepaliveLastPing)}</p>
        </section>

        <section class="admin-card" aria-labelledby="admin-migration-title">
          <h2 id="admin-migration-title">Ultima migrazione</h2>
          <p class="admin-card__value admin-card__value--mono">
            {overview.lastMigration ?? 'Non disponibile'}
          </p>
          <p class="hint">Versione applicata al database.</p>
        </section>

        <section class="admin-card admin-card--wide" aria-labelledby="admin-counts-title">
          <h2 id="admin-counts-title">Conteggi</h2>
          <dl class="admin-counts">
            {ADMIN_COUNT_KEYS.map((key) => (
              <div class="admin-counts__row" key={key}>
                <dt>{COUNT_LABELS[key]}</dt>
                <dd>{countValue(overview.counts[key])}</dd>
              </div>
            ))}
          </dl>
          <p class="hint">Generato il {formatAdminTimestamp(overview.generatedAt)}.</p>
        </section>
      </div>
    </AdminShell>
  )
}

export function AdminPage() {
  const [state, setState] = useState<AdminState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isLiveData) return

    let cancelled = false
    setState({ phase: 'loading' })

    void (async () => {
      try {
        const admin = await checkIsAdmin()
        if (cancelled) return
        if (!admin) {
          setState({ phase: 'denied' })
          return
        }
        const overview = await fetchAdminOverview()
        if (!cancelled) setState({ phase: 'ready', overview })
      } catch (error) {
        if (!cancelled) setState({ phase: 'error', message: mapAdminError(error) })
      }
    })()

    return () => {
      cancelled = true
    }
    // `attempt` è il modo per far ripartire la lettura dal pulsante Aggiorna.
  }, [attempt])

  // In demo/mock non c'è backend da interrogare: la pagina lo spiega e ferma qui.
  if (!isLiveData) return <DemoNotice />

  const refresh = () => setAttempt((value) => value + 1)

  // Il diniego arriva dopo la RPC, quindi il titolo della scheda resta quello
  // della rotta: chi non è admin vede comunque contenuto 404 e nessun dato
  // (`admin_overview()` risponde 42501 indipendentemente dalla UI).
  if (state.phase === 'denied') return <NotFoundPage />

  if (state.phase === 'error') {
    return (
      <AdminShell>
        <p class="alert" role="alert">
          {state.message}
          <button class="alert__action" type="button" onClick={refresh}>
            Riprova
          </button>
        </p>
      </AdminShell>
    )
  }

  if (state.phase === 'loading') {
    return (
      <AdminShell>
        <p class="hint" role="status">
          Carico lo stato del progetto…
        </p>
      </AdminShell>
    )
  }

  return <AdminOverviewView overview={state.overview} onRefresh={refresh} />
}
