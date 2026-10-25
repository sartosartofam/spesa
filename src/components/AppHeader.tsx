import type { FamilyPerson } from '../lib/family'
import { LogOutIcon, SettingsIcon } from './Icons'

interface AppHeaderProps {
  counts: { active: number; urgent: number; history: number }
  people: FamilyPerson[]
  onOpenSettings: () => void
  onLogout: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export function AppHeader({ counts, people, onOpenSettings, onLogout }: AppHeaderProps) {
  return (
    <header class="app-header">
      <div class="app-header__brand">
        <h1 class="app-header__title">Spesa</h1>
        <p class="app-header__summary">
          {counts.active} da prendere
          <span aria-hidden="true"> · </span>
          {counts.history} in storico
        </p>
      </div>

      <ul class="member-list" aria-label="Persone nella lista">
        {people.map((person) => (
          <li class={`member ${person.isCurrentUser ? 'member--current' : ''}`} key={person.id}>
            <span class="member__avatar" aria-hidden="true">
              {initials(person.name)}
            </span>
            <span class="member__name">{person.name}</span>
            {person.isCurrentUser && <span class="member__you">tu</span>}
          </li>
        ))}
      </ul>

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
