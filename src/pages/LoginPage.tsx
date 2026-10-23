import { useEffect, useState } from 'preact/hooks'
import { mapAuthError } from '../lib/auth'
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
      await onSignIn(email.trim(), password)
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
          Usa l’email e la password che ti ha dato chi gestisce la famiglia. Non c’è registrazione
          pubblica.
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
