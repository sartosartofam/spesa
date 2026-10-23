import { LogOutIcon, SettingsIcon } from './Icons'

interface AppHeaderProps {
  counts: { active: number; urgent: number; history: number }
  isMockData: boolean
  userEmail: string
  onOpenSettings: () => void
  onLogout: () => void
}

export function AppHeader({
  counts,
  isMockData,
  userEmail,
  onOpenSettings,
  onLogout,
}: AppHeaderProps) {
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
          {userEmail && <span class="chip">{userEmail}</span>}
        </div>
      </div>
      <div class="app-header__actions">
        <button class="icon-button" type="button" aria-label="Esci" title="Esci" onClick={onLogout}>
          <LogOutIcon />
        </button>
        <button
          class="icon-button"
          type="button"
          aria-label="Impostazioni"
          title="Impostazioni"
          onClick={onOpenSettings}
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  )
}
