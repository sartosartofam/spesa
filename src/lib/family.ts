import { isLiveData } from './data'
import { getSupabase } from './supabase'

export interface FamilyInvite {
  code: string
  expiresAt: string
}

export interface RedeemedFamily {
  familyId: string
  familyName: string
}

export interface LeftFamily {
  leftFamilyId: string
  newOwnerId: string | null
  newFamilyId: string
  newFamilyName: string
}

export interface FamilyMember {
  id: string
  email: string
  displayName: string
  role: 'owner' | 'member'
}

export interface CurrentFamily {
  id: string
  name: string
}

/** Persona mostrata nell'header, senza esporre l'email. */
export interface FamilyPerson {
  id: string
  name: string
  role: 'owner' | 'member'
  isCurrentUser: boolean
}

/**
 * Prepara i nomi da mostrare nell'header. Se l'elenco remoto non contiene
 * ancora l'utente corrente (caricamento o offline), lo aggiunge in testa.
 */
export function familyPeople(
  members: readonly FamilyMember[],
  currentUserId: string,
  currentUserName: string,
): FamilyPerson[] {
  const people = members.map((member) => ({
    id: member.id,
    name: member.displayName.trim() || 'Membro',
    role: member.role,
    isCurrentUser: member.id === currentUserId,
  }))

  if (!currentUserId || people.some((person) => person.id === currentUserId)) {
    return people
  }

  return [
    {
      id: currentUserId,
      name: currentUserName.trim() || 'Tu',
      role: 'member',
      isCurrentUser: true,
    },
    ...people,
  ]
}

function liveClient() {
  if (!isLiveData) throw new Error('Questa operazione richiede il backend Supabase.')
  const client = getSupabase()
  if (!client) throw new Error('Supabase non configurato')
  return client
}

/** Nome da mostrare nel footer, con un fallback per la modalità demo. */
export function familyDisplayName(name: string | null): string {
  return name?.trim() || 'Spesa di famiglia'
}

/** Normalizza un codice invito incollato dall'utente. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase()
}

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

/** Legge la famiglia corrente dell'utente autenticato. */
export async function getCurrentFamily(): Promise<CurrentFamily | null> {
  if (!isLiveData) return null

  const client = liveClient()
  const { data, error } = await client.from('families').select('id, name').maybeSingle()
  if (error) throw error
  return data ?? null
}

/** Rinomina la famiglia corrente. La RPC verifica che il chiamante sia owner. */
export async function renameFamily(name: string): Promise<CurrentFamily> {
  const client = liveClient()
  const { data, error } = await client.rpc('rename_family', { p_name: name.trim() })
  if (error) throw error

  const family = data?.[0]
  if (!family?.family_id) throw new Error('Rinomina della famiglia non riuscita.')
  return { id: family.family_id, name: family.family_name }
}

/** Esce dalla famiglia indicata e restituisce la nuova famiglia personale. */
export async function leaveFamily(familyId: string): Promise<LeftFamily> {
  const client = liveClient()
  const { data, error } = await client.rpc('leave_family', { p_family_id: familyId })
  if (error) throw error

  const result = data?.[0]
  if (!result?.new_family_id) throw new Error('Uscita dalla famiglia non riuscita.')
  return {
    leftFamilyId: result.left_family_id,
    newOwnerId: result.new_owner_id ?? null,
    newFamilyId: result.new_family_id,
    newFamilyName: result.new_family_name,
  }
}

/** Elenca i membri della famiglia visibili all'utente autenticato. */
export async function listFamilyMembers(): Promise<FamilyMember[]> {
  const client = liveClient()
  const { data, error } = await client
    .from('members')
    .select('id, email, display_name, role')
    .order('display_name', { ascending: true })
  if (error) throw error

  return (data ?? []).map((member) => ({
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    role: member.role === 'owner' ? 'owner' : 'member',
  }))
}

/** Nomina owner un altro membro della famiglia. */
export async function promoteFamilyOwner(memberId: string): Promise<void> {
  const client = liveClient()
  const { error } = await client.rpc('promote_family_owner', { p_member_id: memberId })
  if (error) throw error
}

/** Genera un invito monouso per la famiglia dell'utente autenticato. */
export async function createFamilyInvite(): Promise<FamilyInvite> {
  const client = liveClient()
  const { data, error } = await client.rpc('create_family_invite')
  if (error) throw error

  const invite = data?.[0]
  if (!invite?.invite_code) throw new Error('Invito non creato.')
  return { code: invite.invite_code, expiresAt: invite.invite_expires_at }
}

/** Riscatta un invito e restituisce la famiglia di destinazione. */
export async function redeemFamilyInvite(code: string): Promise<RedeemedFamily> {
  const client = liveClient()
  const { data, error } = await client.rpc('redeem_family_invite', {
    p_code: normalizeInviteCode(code),
  })
  if (error) throw error

  const family = data?.[0]
  if (!family?.target_family_id) throw new Error('Cambio famiglia non riuscito.')
  return { familyId: family.target_family_id, familyName: family.target_family_name }
}

/** Data leggibile della scadenza invito, senza dipendere dal fuso del browser. */
export function formatInviteExpiry(expiresAt: string): string {
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Estrae il messaggio anche dai PostgrestError, che non estendono Error. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return String(error)
}

/** Messaggio utente per un errore durante la preparazione della famiglia. */
export function mapFamilyError(error: unknown): string {
  const message = errorMessage(error)

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

/** Messaggio utente per un errore durante la rinomina della famiglia. */
export function mapRenameFamilyError(error: unknown): string {
  const message = errorMessage(error)

  const knownMessages = [
    'Il nome della famiglia non può essere vuoto.',
    'Il nome della famiglia è troppo lungo (massimo 80 caratteri).',
    'Solo un owner può rinominare la famiglia.',
    'Famiglia non trovata. Ricarica l’app.',
  ]

  const known = knownMessages.find((text) => message.includes(text))
  if (known) return known

  if (/not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (/supabase non configurato|richiede il backend/i.test(message)) {
    return 'La rinomina è disponibile solo con il backend configurato.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Non è stato possibile rinominare la famiglia. Riprova.'
}

/** Messaggio utente per un errore durante l'uscita dalla famiglia. */
export function mapLeaveFamilyError(error: unknown): string {
  const message = errorMessage(error)

  const knownMessages = [
    'La famiglia è cambiata. Ricarica l’app.',
    'Famiglia non trovata. Ricarica l’app.',
    'Famiglia non valida.',
  ]

  const known = knownMessages.find((text) => message.includes(text))
  if (known) return known

  if (/not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (/supabase non configurato|richiede il backend/i.test(message)) {
    return 'L’uscita dalla famiglia è disponibile solo con il backend configurato.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Non è stato possibile uscire dalla famiglia. Riprova.'
}

/** Messaggio utente per un errore di invito o cambio famiglia. */
export function mapInviteError(error: unknown): string {
  const message = errorMessage(error)

  const knownMessages = [
    'Invito non valido o scaduto.',
    'Questo invito è già stato usato.',
    'Fai già parte di questa famiglia.',
    'Sei l’unico owner della famiglia attuale. Nomina un altro owner prima di cambiare famiglia.',
    'Inserisci un codice invito.',
    'Esiste già un membro con questa email nella famiglia di destinazione.',
    'Famiglia non trovata. Ricarica l’app.',
    'Solo un owner può nominare un altro owner.',
    'Membro non trovato nella tua famiglia.',
    'Membro non valido.',
    'Sei già owner.',
  ]

  const known = knownMessages.find((text) => message.includes(text))
  if (known) return known

  if (/not authenticated|non autenticato|jwt|session/i.test(message)) {
    return 'Sessione scaduta. Accedi di nuovo.'
  }
  if (/supabase non configurato|richiede(?:no)? il backend/i.test(message)) {
    return 'Gli inviti sono disponibili solo con il backend configurato.'
  }
  if (/fetch|network|failed to fetch|load failed|offline/i.test(message)) {
    return 'Impossibile contattare il server. Controlla la connessione e riprova.'
  }
  return 'Non è stato possibile completare l’operazione. Riprova.'
}
