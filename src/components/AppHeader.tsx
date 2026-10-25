import { LogOutIcon, SettingsIcon } from './Icons'

interface AppHeaderProps {
  counts: { active: number; urgent: number; history: number }
  isMockData: boolean
  userEmail: string
  familyName: string | null
  onOpenSettings: () => void
  onLogout: () => void
}

export function AppHeader({
  counts,
  isMockData,
  userEmail,
  familyName,
  onOpenSettings,
  onLogout,
}: AppHeaderProps) {
  const urgentLabel = counts.urgent === 1 ? 'urgente' : 'urgenti'
  const familyInitial = familyName?.trim().charAt(0).toUpperCase() || 'S'

  return (
    <header class="app-header">
      <div class="app-header__bar">
        <span class="app-header__dots" aria-hidden="true">
          <span class="app-header__dot" />
          <span class="app-header__dot" />
          <span class="app-header__dot" />
        </span>
        <h1 class="app-header__title">Spesa</h1>
        <p class="app-header__summary">
          {counts.active} da prendere · {counts.history} in storico
        </p>
        <div class="app-header__actions">
          <button
            class="icon-button"
            type="button"
            aria-label="Esci"
            title="Esci"
            onClick={onLogout}
          >
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
      </div>

      <div class="app-header__meta">
        {familyName && (
          <span class="family-badge">
            <span class="family-badge__avatar" aria-hidden="true">
              {familyInitial}
            </span>
            <span class="family-badge__name">{familyName}</span>
          </span>
        )}
        {counts.urgent > 0 && (
          <span class="chip chip--urgent">
            {counts.urgent} {urgentLabel}
          </span>
        )}
        {isMockData ? (
          <span class="chip chip--demo">dati demo</span>
        ) : (
          <span class="chip chip--live">
            <span class="chip__dot" aria-hidden="true" />
            dati condivisi
          </span>
        )}
        {userEmail && <span class="chip chip--email">{userEmail}</span>}
      </div>
    </header>
  )
}
