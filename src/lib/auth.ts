/** Normalizza l'email prima di ogni chiamata ad Auth o al database. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** URL a cui Supabase rimanda dopo il link di recupero password. */
export function passwordResetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/reset-password`
}

/** Lunghezza minima, allineata a `minimum_password_length` in supabase/config.toml. */
export const PASSWORD_MIN_LENGTH = 8

/** Requisiti mostrati sotto il campo password, identici nei due form. */
export const PASSWORD_REQUIREMENTS =
  'Almeno 8 caratteri, con maiuscola, minuscola, numero e simbolo.'

/** Errore di validazione della password. */
export const PASSWORD_ERROR =
  'La password deve avere almeno 8 caratteri e contenere maiuscola, minuscola, numero e simbolo.'

/**
 * Applica gli stessi requisiti di Supabase (`minimum_password_length = 8`,
 * `password_requirements = lower_upper_letters_digits_symbols`) prima della
 * chiamata di rete, così l'errore è immediato. Il server ricontrolla comunque:
 * qui basta non essere più severi di lui.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_ERROR
  if (!/[a-z]/.test(password)) return PASSWORD_ERROR
  if (!/[A-Z]/.test(password)) return PASSWORD_ERROR
  if (!/[0-9]/.test(password)) return PASSWORD_ERROR
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_ERROR
  return null
}

interface UserWithDisplayName {
  user_metadata?: Record<string, unknown> | null
}

/** Nome leggibile dell'utente autenticato, con fallback neutro. */
export function userDisplayName(user: UserWithDisplayName | null | undefined): string {
  const value = user?.user_metadata?.display_name
  return typeof value === 'string' && value.trim() ? value.trim() : 'Tu'
}

/** Messaggi di errore di accesso e registrazione, senza dettagli tecnici. */
export function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (/invalid login credentials|invalid_credentials|invalid_grant/i.test(message)) {
    return 'Email o password non corretti.'
  }
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return 'Email non confermata. Controlla la tua casella e clicca il link di conferma.'
  }
  if (/user already registered|already registered|email.*already.*registered/i.test(message)) {
    return 'Se l’indirizzo è valido, riceverai un’email di conferma. Se hai già un account, prova ad accedere.'
  }
  if (/same password|same_password|different from the old password/i.test(message)) {
    return 'La nuova password deve essere diversa da quella attuale.'
  }
  if (/password.*(at least|length|weak|short)|weak_password/i.test(message)) {
    return PASSWORD_ERROR
  }
  if (/signups? not allowed|signup.*disabled|signup_disabled/i.test(message)) {
    return 'Le registrazioni sono chiuse. Contatta chi gestisce l’app.'
  }
  if (/invalid email|email.*invalid|email_address_invalid/i.test(message)) {
    return 'Inserisci un indirizzo email valido.'
  }
  if (/rate limit|too many|over_email_send_rate_limit/i.test(message)) {
    return 'Troppi tentativi. Attendi qualche minuto e riprova.'
  }
  if (/supabase non configurato/i.test(message)) {
    return 'Supabase non è configurato. Esegui npm run env:local e riavvia lo sviluppo.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Operazione non riuscita. Riprova.'
}
