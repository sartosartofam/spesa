/** Normalizza l'email prima di ogni chiamata ad Auth o al database. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
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
    return 'Esiste già un account con questa email. Prova ad accedere.'
  }
  if (/password.*(at least|length|weak|short)|weak_password/i.test(message)) {
    return 'La password deve avere almeno 8 caratteri.'
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
