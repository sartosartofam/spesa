import { describe, expect, it } from 'vitest'
import {
  familyDisplayName,
  familyPeople,
  formatInviteExpiry,
  mapFamilyError,
  mapInviteError,
  mapLeaveFamilyError,
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

describe('familyPeople', () => {
  const ada = {
    id: 'ada',
    displayName: 'Ada',
    role: 'owner' as const,
  }
  const bruno = {
    id: 'bruno',
    displayName: 'Bruno',
    role: 'member' as const,
  }

  it('mostra i nomi dei membri e segnala l’utente corrente', () => {
    expect(familyPeople([ada, bruno], 'bruno', 'Bruno')).toEqual([
      { id: 'ada', name: 'Ada', role: 'owner', isCurrentUser: false },
      { id: 'bruno', name: 'Bruno', role: 'member', isCurrentUser: true },
    ])
  })

  it('aggiunge l’utente corrente se l’elenco remoto non lo contiene', () => {
    expect(familyPeople([ada], 'bruno', '  Bruno  ')).toEqual([
      { id: 'bruno', name: 'Bruno', role: 'member', isCurrentUser: true },
      { id: 'ada', name: 'Ada', role: 'owner', isCurrentUser: false },
    ])
    expect(familyPeople([], 'bruno', '')).toEqual([
      { id: 'bruno', name: 'Tu', role: 'member', isCurrentUser: true },
    ])
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

describe('mapLeaveFamilyError', () => {
  it('mantiene i messaggi noti della RPC', () => {
    expect(mapLeaveFamilyError(new Error('La famiglia è cambiata. Ricarica l’app.'))).toBe(
      'La famiglia è cambiata. Ricarica l’app.',
    )
    expect(mapLeaveFamilyError(new Error('Famiglia non valida.'))).toBe('Famiglia non valida.')
  })

  it('traduce errori di rete e backend assente', () => {
    expect(mapLeaveFamilyError(new Error('Failed to fetch'))).toBe(
      'Impossibile contattare il server. Controlla la connessione e riprova.',
    )
    expect(mapLeaveFamilyError(new Error('Questa operazione richiede il backend Supabase.'))).toBe(
      'L’uscita dalla famiglia è disponibile solo con il backend configurato.',
    )
  })

  it('ha un fallback dedicato all’uscita', () => {
    expect(mapLeaveFamilyError(new Error('boom'))).toBe(
      'Non è stato possibile uscire dalla famiglia. Riprova.',
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
