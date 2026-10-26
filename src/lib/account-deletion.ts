import { isLiveData } from './data'
import { getSupabase } from './supabase'

/**
 * Cancella l'account dell'utente autenticato e i dati associati.
 *
 * In modalità live la RPC `delete_current_account()` è `security definer` e
 * usa solo `auth.uid()`: il client non può indicare un altro account. In
 * modalità mock non c'è backend, quindi rimuoviamo solo i dati locali.
 */
export async function deleteCurrentAccount(): Promise<void> {
  if (!isLiveData) {
    clearLocalAppData()
    return
  }

  const client = getSupabase()
  if (!client) throw new Error('Supabase non configurato')

  const { error } = await client.rpc('delete_current_account')
  if (error) throw error

  clearLocalAppData()
}

/** Rimuove le cache applicative locali, senza toccare altri siti sullo stesso dominio. */
export function clearLocalAppData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('spesa.')) localStorage.removeItem(key)
    }
  } catch {
    // Storage non disponibile: non c'è nulla da ripulire.
  }
}

/** Messaggi leggibili per la cancellazione account, senza dettagli tecnici. */
export function mapDeleteAccountError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)
  if (/not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo e riprova.'
  }
  if (/supabase non configurato/i.test(message)) {
    return 'La cancellazione dell’account non è configurata.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Cancellazione non riuscita. Riprova o contatta l’assistenza.'
}
