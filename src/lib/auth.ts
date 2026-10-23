/** Messaggi di errore dell'accesso, senza esporre dettagli tecnici al membro. */
export function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (/invalid login credentials|invalid_credentials|invalid_grant/i.test(message)) {
    return 'Email o password non corretti.'
  }
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return 'Email non confermata. Chiedi a chi gestisce la famiglia di confermarla.'
  }
  if (/supabase non configurato/i.test(message)) {
    return 'Supabase non è configurato. Esegui npm run env:local e riavvia lo sviluppo.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Accesso non riuscito. Riprova.'
}
