import { useEffect, useState } from 'preact/hooks'
import { mapAuthError, normalizeEmail } from '../lib/auth'
import { navigate } from '../lib/routes'

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<void>
  initialError: string | null
}

export function LoginPage({ onSignIn, initialError }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setError(initialError)
  }, [initialError])

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      await onSignIn(normalizeEmail(email), password)
      navigate('/app', { replace: true })
    } catch (signInError) {
      setError(mapAuthError(signInError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div class="auth-page">
      <main class="auth-card" aria-labelledby="login-title">
        <p class="landing__eyebrow">Spesa di famiglia</p>
        <h1 id="login-title">Accedi alla lista</h1>
        <p class="auth-card__intro">
          Accedi con la tua email e la password. Se non hai ancora un account, puoi crearne uno e
          avere subito la tua famiglia.
        </p>

        {error && (
          <p class="alert" role="alert" id="login-error">
            {error}
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div class="field">
            <label class="field__label" for="login-email">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autocomplete="email"
              autocapitalize="none"
              spellcheck={false}
              required
              value={email}
              onInput={(event) => setEmail(event.currentTarget.value)}
            />
          </div>

          <div class="field">
            <label class="field__label" for="login-password">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              value={password}
              onInput={(event) => setPassword(event.currentTarget.value)}
            />
          </div>

          <button class="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <a
          class="auth-card__back"
          href="/register"
          onClick={(event) => {
            event.preventDefault()
            navigate('/register')
          }}
        >
          Non hai un account? Registrati
        </a>
        <a
          class="auth-card__back"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          Torna alla pagina iniziale
        </a>
      </main>
    </div>
  )
}
