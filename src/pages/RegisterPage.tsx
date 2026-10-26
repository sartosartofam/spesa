import { useEffect, useState } from 'preact/hooks'
import type { SignUpInput, SignUpResult } from '../hooks/useAuth'
import { mapAuthError, normalizeEmail } from '../lib/auth'
import { navigate } from '../lib/routes'

interface RegisterPageProps {
  onSignUp: (input: SignUpInput) => Promise<SignUpResult>
  initialError: string | null
}

export function RegisterPage({ onSignUp, initialError }: RegisterPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    setError(initialError)
  }, [initialError])

  async function submit() {
    setError(null)

    if (!displayName.trim()) {
      setError('Inserisci il tuo nome.')
      return
    }
    if (!familyName.trim()) {
      setError('Inserisci il nome della famiglia.')
      return
    }
    if (password.length < 12) {
      setError('La password deve avere almeno 12 caratteri.')
      return
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }

    setSubmitting(true)
    try {
      const result = await onSignUp({ email, password, displayName, familyName })
      if (result.needsConfirmation) {
        setSentTo(normalizeEmail(email))
        return
      }
      navigate('/app', { replace: true })
    } catch (signUpError) {
      setError(mapAuthError(signUpError))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div class="auth-page">
        <main class="auth-card" aria-labelledby="register-sent-title">
          <p class="landing__eyebrow">Registrazione quasi finita</p>
          <h1 id="register-sent-title">Controlla la tua email</h1>
          <p class="auth-card__intro" role="status">
            Ti abbiamo inviato un link di conferma a <strong>{sentTo}</strong>. Aprilo, poi torna
            qui e accedi con la password che hai scelto.
          </p>
          <a
            class="button button--primary"
            href="/login"
            onClick={(event) => {
              event.preventDefault()
              navigate('/login')
            }}
          >
            Vai al login
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

  return (
    <div class="auth-page">
      <main class="auth-card" aria-labelledby="register-title">
        <p class="landing__eyebrow">Spesa di famiglia</p>
        <h1 id="register-title">Crea la tua famiglia</h1>
        <p class="auth-card__intro">
          Crea un account e la tua famiglia personale. La lista è subito pronta per te.
        </p>

        {error && (
          <p class="alert" role="alert" id="register-error">
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
            <label class="field__label" for="register-name">
              Nome
            </label>
            <input
              id="register-name"
              name="name"
              type="text"
              autocomplete="name"
              required
              maxLength={80}
              value={displayName}
              onInput={(event) => setDisplayName(event.currentTarget.value)}
            />
          </div>

          <div class="field">
            <label class="field__label" for="register-family">
              Nome della famiglia
            </label>
            <input
              id="register-family"
              name="family"
              type="text"
              autocomplete="organization"
              required
              maxLength={80}
              value={familyName}
              onInput={(event) => setFamilyName(event.currentTarget.value)}
            />
          </div>

          <div class="field">
            <label class="field__label" for="register-email">
              Email
            </label>
            <input
              id="register-email"
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
            <label class="field__label" for="register-password">
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              value={password}
              onInput={(event) => setPassword(event.currentTarget.value)}
              aria-describedby="register-password-hint"
            />
            <span class="hint" id="register-password-hint">
              Almeno 12 caratteri.
            </span>
          </div>

          <div class="field">
            <label class="field__label" for="register-password-confirm">
              Conferma password
            </label>
            <input
              id="register-password-confirm"
              name="password-confirm"
              type="password"
              autocomplete="new-password"
              required
              value={confirmPassword}
              onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            />
          </div>

          <button class="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Creazione in corso…' : 'Crea account'}
          </button>
        </form>

        <p class="auth-card__privacy">
          Registrandoti accetti l’
          <a
            href="/privacy"
            onClick={(event) => {
              event.preventDefault()
              navigate('/privacy')
            }}
          >
            Informativa Privacy
          </a>
          .
        </p>

        <a
          class="auth-card__back"
          href="/login"
          onClick={(event) => {
            event.preventDefault()
            navigate('/login')
          }}
        >
          Hai già un account? Accedi
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
