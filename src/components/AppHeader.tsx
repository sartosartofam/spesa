import { SettingsIcon } from './Icons'

interface AppHeaderProps {
  counts: { active: number; urgent: number; history: number }
  isMockData: boolean
  onOpenSettings: () => void
}

export function AppHeader({ counts, isMockData, onOpenSettings }: AppHeaderProps) {
  const urgentLabel = counts.urgent === 1 ? 'urgente' : 'urgenti'

  return (
    <header class="app-header">
      <div class="app-header__text">
        <h1 class="app-header__title">Spesa</h1>
        <p class="app-header__subtitle">
          {counts.active} da prendere · {counts.history} in storico
        </p>
        <div class="app-header__chips">
          {counts.urgent > 0 && (
            <span class="chip chip--urgent">
              {counts.urgent} {urgentLabel}
            </span>
          )}
          {isMockData && <span class="chip">dati demo</span>}
        </div>
      </div>
      <button
        class="icon-button"
        type="button"
        aria-label="Impostazioni"
        title="Impostazioni"
        onClick={onOpenSettings}
      >
        <SettingsIcon />
      </button>
    </header>
  )
}
