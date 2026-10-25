import { navigate } from '../lib/routes'

interface PublicHeaderProps {
  overlay?: boolean
  authenticated?: boolean
}

export function PublicHeader({ overlay = false, authenticated = false }: PublicHeaderProps) {
  return (
    <header class={`public-header${overlay ? ' public-header--overlay' : ''}`}>
      <a
        class="public-brand"
        href="/"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
      >
        Spesa
      </a>
      <nav class="public-header__actions" aria-label="Accesso">
        {authenticated ? (
          <a
            class="button button--primary"
            href="/app"
            onClick={(event) => {
              event.preventDefault()
              navigate('/app')
            }}
          >
            Apri la lista
          </a>
        ) : (
          <>
            <a
              class="button button--ghost"
              href="/login"
              onClick={(event) => {
                event.preventDefault()
                navigate('/login')
              }}
            >
              Accedi
            </a>
            <a
              class="button button--primary"
              href="/register"
              onClick={(event) => {
                event.preventDefault()
                navigate('/register')
              }}
            >
              Registrati
            </a>
          </>
        )}
      </nav>
    </header>
  )
}
