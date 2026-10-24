import { useEffect, useRef, useState } from 'preact/hooks'
import { App } from './app'
import { useAuth } from './hooks/useAuth'
import { type DocumentMeta, useDocumentMeta } from './hooks/useDocumentMeta'
import { useRoute } from './hooks/useRoute'
import { mapAuthError } from './lib/auth'
import { ensureCurrentFamily, mapFamilyError } from './lib/family'
import { type AppRoute, navigate } from './lib/routes'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'

const LANDING_DESCRIPTION =
  'Spesa è la lista della spesa condivisa per famiglie: gratuita, senza pubblicità e sempre aggiornata. Aggiungi articoli, segnala le urgenze e consulta lo storico.'

function metaFor(route: AppRoute): DocumentMeta {
  if (route === 'landing') {
    return {
      title: 'Spesa — lista della spesa condivisa per famiglie',
      description: LANDING_DESCRIPTION,
      robots: 'index, follow',
    }
  }
  if (route === 'login') {
    return {
      title: 'Accedi | Spesa',
      description: 'Accedi alla lista della spesa condivisa della tua famiglia.',
      robots: 'noindex, nofollow',
    }
  }
  if (route === 'register') {
    return {
      title: 'Registrati | Spesa',
      description: 'Crea il tuo account e la tua famiglia personale su Spesa.',
      robots: 'noindex, nofollow',
    }
  }
  if (route === 'app') {
    return {
      title: 'La tua lista | Spesa',
      description: 'Lista della spesa condivisa della famiglia.',
      robots: 'noindex, nofollow',
    }
  }
  return {
    title: 'Pagina non trovata | Spesa',
    description: 'La pagina richiesta non esiste.',
    robots: 'noindex, nofollow',
  }
}

function LoadingPage() {
  return (
    <main class="loading-page">
      <p class="hint" role="status">
        Carico la sessione…
      </p>
    </main>
  )
}

interface FamilyErrorPageProps {
  message: string
  onRetry: () => void
  onLogout: () => void
}

function FamilyErrorPage({ message, onRetry, onLogout }: FamilyErrorPageProps) {
  return (
    <div class="auth-page">
      <main class="auth-card" aria-labelledby="family-error-title">
        <p class="landing__eyebrow">Preparazione della famiglia</p>
        <h1 id="family-error-title">Non riesco a preparare la tua famiglia</h1>
        <p class="alert" role="alert">
          {message}
        </p>
        <button class="button button--primary" type="button" onClick={onRetry}>
          Riprova
        </button>
        <button class="button button--ghost" type="button" onClick={onLogout}>
          Esci
        </button>
      </main>
    </div>
  )
}

export function Root() {
  const { route } = useRoute()
  const auth = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [familyReadyFor, setFamilyReadyFor] = useState<string | null>(null)
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [familyAttempt, setFamilyAttempt] = useState(0)
  const loggingOut = useRef(false)

  useDocumentMeta(metaFor(route))

  useEffect(() => {
    if (auth.status === 'authenticated') {
      loggingOut.current = false
      if (route === 'landing' || route === 'login' || route === 'register') {
        navigate('/app', { replace: true })
      }
      return
    }
    if (auth.status === 'anonymous' && route === 'app' && !loggingOut.current) {
      navigate('/login', { replace: true })
      return
    }
    if (route !== 'app') loggingOut.current = false
  }, [auth.status, route])

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.user) {
      setFamilyReadyFor(null)
      setFamilyError(null)
      return
    }

    const userId = auth.user.id
    let cancelled = false

    setFamilyReadyFor(null)
    setFamilyError(null)

    void ensureCurrentFamily()
      .then(() => {
        if (!cancelled) setFamilyReadyFor(userId)
      })
      .catch((error: unknown) => {
        if (!cancelled) setFamilyError(mapFamilyError(error))
      })

    return () => {
      cancelled = true
    }
  }, [auth.status, auth.user?.id, familyAttempt])

  async function handleLogout() {
    setLogoutError(null)
    loggingOut.current = true
    try {
      await auth.signOut()
      navigate('/', { replace: true })
    } catch (error) {
      loggingOut.current = false
      setLogoutError(mapAuthError(error))
    }
  }

  if (auth.status === 'loading') return <LoadingPage />

  if (route === 'landing') {
    if (auth.status === 'authenticated') return <LoadingPage />
    return <LandingPage />
  }

  if (route === 'login') {
    if (auth.status === 'authenticated') return <LoadingPage />
    return <LoginPage onSignIn={auth.signIn} initialError={auth.error} />
  }

  if (route === 'register') {
    if (auth.status === 'authenticated') return <LoadingPage />
    return <RegisterPage onSignUp={auth.signUp} initialError={auth.error} />
  }

  if (route === 'app') {
    if (auth.status !== 'authenticated') return <LoadingPage />
    if (familyError) {
      return (
        <FamilyErrorPage
          message={familyError}
          onRetry={() => setFamilyAttempt((attempt) => attempt + 1)}
          onLogout={() => {
            void handleLogout()
          }}
        />
      )
    }
    if (familyReadyFor !== auth.user?.id) return <LoadingPage />
    return (
      <App
        userEmail={auth.user?.email ?? ''}
        userId={auth.user?.id ?? ''}
        authError={logoutError}
        onLogout={handleLogout}
      />
    )
  }

  return <NotFoundPage />
}
