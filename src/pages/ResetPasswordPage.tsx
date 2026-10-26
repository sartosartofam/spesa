import { useState } from 'preact/hooks'
import { mapAuthError } from '../lib/auth'
import { navigate } from '../lib/routes'

interface ResetPasswordPageProps {
  onUpdate: (password: string) => Promise<void>
  sessionAvailable: boolean
}

export function ResetPasswordPage({ onUpdate, sessionAvailable }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    setError(null)

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
      await onUpdate(password)
      setDone(true)
    } catch (updateError) {
      setError(mapAuthError(updateError))
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionAvailable) {
    return (
      <div class="auth-page">
        <main class="auth-card" aria-labelledby="reset-invalid-title">
          <p class="landing__eyebrow">Recupero password</p>
          <h1 id="reset-invalid-title">Link non valido o scaduto</h1>
          <p class="auth-card__intro">
            Il link per reimpostare la password non è più utilizzabile. Richiedine uno nuovo:
            arriverà all’indirizzo email del tuo account.
          </p>
          <a
            class="button button--primary"
            href="/forgot-password"
            onClick={(event) => {
              event.preventDefault()
              navigate('/forgot-password')
            }}
          >
            Richiedi un nuovo link
          </a>
          <a
            class="auth-card__back"
            href="/login"
            onClick={(event) => {
              event.preventDefault()
              navigate('/login')
            }}
          >
            Torna al login
          </a>
        </main>
      </div>
    )
  }

  if (done) {
    return (
      <div class="auth-page">
        <main class="auth-card" aria-labelledby="reset-done-title">
          <p class="landing__eyebrow">Recupero password</p>
          <h1 id="reset-done-title">Password aggiornata</h1>
          <p class="notice" role="status">
            La nuova password è attiva. Da adesso puoi accedere con quella.
          </p>
          <a
            class="button button--primary"
            href="/app"
            onClick={(event) => {
              event.preventDefault()
              navigate('/app', { replace: true })
            }}
          >
            Vai alla lista
          </a>
        </main>
      </div>
    )
  }

  return (
    <div class="auth-page">
      <main class="auth-card" aria-labelledby="reset-title">
        <p class="landing__eyebrow">Recupero password</p>
        <h1 id="reset-title">Imposta una nuova password</h1>
        <p class="auth-card__intro">
          Scegli una password di almeno 12 caratteri. Dopo il salvataggio potrai usarla per
          accedere.
        </p>

        {error && (
          <p class="alert" role="alert" id="reset-error">
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
            <label class="field__label" for="reset-password">
              Nuova password
            </label>
            <input
              id="reset-password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              value={password}
              onInput={(event) => setPassword(event.currentTarget.value)}
              aria-describedby="reset-password-hint"
            />
            <span class="hint" id="reset-password-hint">
              Almeno 12 caratteri.
            </span>
          </div>

          <div class="field">
            <label class="field__label" for="reset-password-confirm">
              Conferma nuova password
            </label>
            <input
              id="reset-password-confirm"
              name="password-confirm"
              type="password"
              autocomplete="new-password"
              required
              value={confirmPassword}
              onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            />
          </div>

          <button class="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio in corso…' : 'Aggiorna password'}
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
          Torna al login
        </a>
      </main>
    </div>
  )
}
