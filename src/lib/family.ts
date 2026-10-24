import { isLiveData } from './data'
import { getSupabase } from './supabase'

/**
 * Crea la famiglia personale dell'utente autenticato, se non esiste già.
 *
 * La funzione SQL è idempotente e `security definer`: il client non può
 * scegliere una famiglia esistente né inserirsi in quella di altri. In
 * modalità mock non c'è backend da preparare e la chiamata è un no-op.
 */
export async function ensureCurrentFamily(): Promise<void> {
  if (!isLiveData) return

  const client = getSupabase()
  if (!client) throw new Error('Supabase non configurato')

  const { error } = await client.rpc('ensure_current_family')
  if (error) throw error
}

/** Messaggio utente per un errore durante la preparazione della famiglia. */
export function mapFamilyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (/not authenticated|utente non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (/email non valida/i.test(message)) {
    return 'La tua email non è valida. Contatta chi gestisce l’app.'
  }
  if (/supabase non configurato/i.test(message)) {
    return 'Supabase non è configurato. Esegui npm run env:local e riavvia lo sviluppo.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Non è stato possibile preparare la tua famiglia. Riprova.'
}
