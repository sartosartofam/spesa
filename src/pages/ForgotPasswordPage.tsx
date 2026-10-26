import { useState } from 'preact/hooks'
import { mapAuthError, normalizeEmail } from '../lib/auth'
import { navigate } from '../lib/routes'

interface ForgotPasswordPageProps {
  onRequest: (email: string) => Promise<void>
}

export function ForgotPasswordPage({ onRequest }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const normalized = normalizeEmail(email)

    if (!normalized) {
      setError('Inserisci l’indirizzo email del tuo account.')
      return
    }

    setSubmitting(true)
    try {
      await onRequest(normalized)
      setSentTo(normalized)
    } catch (requestError) {
      setError(mapAuthError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div class="auth-page">
        <main class="auth-card" aria-labelledby="forgot-sent-title">
          <p class="landing__eyebrow">Recupero password</p>
          <h1 id="forgot-sent-title">Controlla la tua email</h1>
          <p class="auth-card__intro" role="status">
            Se <strong>{sentTo}</strong> è associato a un account, riceverai un’email con il link
            per impostare una nuova password. Il link scade dopo un po’: se non lo trovi, controlla
            anche la posta indesiderata.
          </p>
          <a
            class="button button--primary"
            href="/login"
            onClick={(event) => {
              event.preventDefault()
              navigate('/login')
            }}
          >
            Torna al login
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
      <main class="auth-card" aria-labelledby="forgot-title">
        <p class="landing__eyebrow">Recupero password</p>
        <h1 id="forgot-title">Password dimenticata?</h1>
        <p class="auth-card__intro">
          Inserisci l’email del tuo account: ti invieremo un link per impostare una nuova password.
        </p>

        {error && (
          <p class="alert" role="alert" id="forgot-error">
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
            <label class="field__label" for="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
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

          <button class="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Invio in corso…' : 'Invia link di recupero'}
          </button>
        </form>

        <a
          class="auth-card__back"
          href="/login"
          onClick={(event) => {
            event.preventDefault()
            navigate('/login')
          }}
        >
          Ricordi la password? Accedi
        </a>
        <a
          class="auth-card__back"
          href="/privacy"
          onClick={(event) => {
            event.preventDefault()
            navigate('/privacy')
          }}
        >
          Informativa Privacy
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
