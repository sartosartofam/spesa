import { describe, expect, it } from 'vitest'
import {
  familyDisplayName,
  formatInviteExpiry,
  mapFamilyError,
  mapInviteError,
  mapRenameFamilyError,
  normalizeInviteCode,
} from './family'

describe('familyDisplayName', () => {
  it('usa il nome della famiglia quando c’è', () => {
    expect(familyDisplayName('Famiglia Rossi')).toBe('Famiglia Rossi')
  })

  it('ha un fallback quando il nome manca o è vuoto', () => {
    expect(familyDisplayName(null)).toBe('Spesa di famiglia')
    expect(familyDisplayName('   ')).toBe('Spesa di famiglia')
  })
})

describe('normalizeInviteCode', () => {
  it('toglie spazi e porta il codice in maiuscolo', () => {
    expect(normalizeInviteCode('  ab12cd34ef56  ')).toBe('AB12CD34EF56')
  })
})

describe('formatInviteExpiry', () => {
  it('formatta una data valida', () => {
    expect(formatInviteExpiry('2026-10-24T12:00:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('non mostra nulla per una data non valida', () => {
    expect(formatInviteExpiry('non-una-data')).toBe('')
  })
})

describe('mapRenameFamilyError', () => {
  it('mantiene i messaggi noti della RPC', () => {
    expect(mapRenameFamilyError(new Error('Solo un owner può rinominare la famiglia.'))).toBe(
      'Solo un owner può rinominare la famiglia.',
    )
    expect(
      mapRenameFamilyError(
        new Error('Il nome della famiglia è troppo lungo (massimo 80 caratteri).'),
      ),
    ).toBe('Il nome della famiglia è troppo lungo (massimo 80 caratteri).')
  })

  it('traduce errori di rete e backend assente', () => {
    expect(mapRenameFamilyError(new Error('Failed to fetch'))).toBe(
      'Impossibile contattare il server. Controlla la connessione e riprova.',
    )
    expect(mapRenameFamilyError(new Error('Questa operazione richiede il backend Supabase.'))).toBe(
      'La rinomina è disponibile solo con il backend configurato.',
    )
  })

  it('ha un fallback dedicato alla rinomina', () => {
    expect(mapRenameFamilyError(new Error('boom'))).toBe(
      'Non è stato possibile rinominare la famiglia. Riprova.',
    )
  })
})

describe('mapInviteError', () => {
  it('mantiene i messaggi noti delle RPC', () => {
    expect(mapInviteError(new Error('Invito non valido o scaduto.'))).toBe(
      'Invito non valido o scaduto.',
    )
    expect(mapInviteError(new Error('Questo invito è già stato usato.'))).toBe(
      'Questo invito è già stato usato.',
    )
    expect(
      mapInviteError(
        new Error(
          'Sei l’unico owner della famiglia attuale. Nomina un altro owner prima di cambiare famiglia.',
        ),
      ),
    ).toBe(
      'Sei l’unico owner della famiglia attuale. Nomina un altro owner prima di cambiare famiglia.',
    )
  })

  it('legge il messaggio anche da un PostgrestError', () => {
    expect(mapInviteError({ message: 'Invito non valido o scaduto.', code: 'P0002' })).toBe(
      'Invito non valido o scaduto.',
    )
  })

  it('traduce errori di rete', () => {
    expect(mapInviteError(new Error('Failed to fetch'))).toBe(
      'Impossibile contattare il server. Controlla la connessione e riprova.',
    )
  })

  it('ha un fallback generico', () => {
    expect(mapInviteError(new Error('boom'))).toBe(
      'Non è stato possibile completare l’operazione. Riprova.',
    )
  })
})

describe('mapFamilyError', () => {
  it('traduce una sessione scaduta', () => {
    expect(mapFamilyError(new Error('Utente non autenticato.'))).toBe(
      'Sessione scaduta. Accedi di nuovo.',
    )
  })

  it('ha un fallback dedicato alla famiglia', () => {
    expect(mapFamilyError(new Error('boom'))).toBe(
      'Non è stato possibile preparare la tua famiglia. Riprova.',
    )
  })
})
