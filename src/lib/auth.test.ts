import { describe, expect, it } from 'vitest'
import {
  mapAuthError,
  normalizeEmail,
  PASSWORD_ERROR,
  passwordResetRedirectUrl,
  userDisplayName,
  validatePassword,
} from './auth'

describe('normalizeEmail', () => {
  it('toglie spazi e porta tutto in minuscolo', () => {
    expect(normalizeEmail('  Ada@Example.Test  ')).toBe('ada@example.test')
    expect(normalizeEmail('demo@spesa.test')).toBe('demo@spesa.test')
  })
})

describe('passwordResetRedirectUrl', () => {
  it('costruisce l’URL di ritorno senza slash duplicati', () => {
    expect(passwordResetRedirectUrl('http://localhost:5173')).toBe(
      'http://localhost:5173/reset-password',
    )
    expect(passwordResetRedirectUrl('https://spesa.example/')).toBe(
      'https://spesa.example/reset-password',
    )
  })
})

describe('userDisplayName', () => {
  it('usa il nome salvato nei metadati', () => {
    expect(userDisplayName({ user_metadata: { display_name: '  Ada  ' } })).toBe('Ada')
  })

  it('ha un fallback quando il nome manca', () => {
    expect(userDisplayName(null)).toBe('Tu')
    expect(userDisplayName({ user_metadata: {} })).toBe('Tu')
    expect(userDisplayName({ user_metadata: { display_name: '   ' } })).toBe('Tu')
  })
})

describe('mapAuthError', () => {
  it('traduce credenziali errate', () => {
    expect(mapAuthError(new Error('Invalid login credentials'))).toBe(
      'Email o password non corretti.',
    )
  })

  it('traduce email non confermata', () => {
    expect(mapAuthError(new Error('Email not confirmed'))).toBe(
      'Email non confermata. Controlla la tua casella e clicca il link di conferma.',
    )
  })

  it('non rivela se un indirizzo è già registrato', () => {
    expect(mapAuthError(new Error('User already registered'))).toBe(
      'Se l’indirizzo è valido, riceverai un’email di conferma. Se hai già un account, prova ad accedere.',
    )
  })

  it('traduce password debole', () => {
    expect(mapAuthError(new Error('Password should be at least 12 characters'))).toBe(
      PASSWORD_ERROR,
    )
    expect(
      mapAuthError(new Error('Password should contain at least one character of each: abc')),
    ).toBe(PASSWORD_ERROR)
  })

  it('chiede una password diversa da quella attuale', () => {
    expect(mapAuthError(new Error('New password should be different from the old password.'))).toBe(
      'La nuova password deve essere diversa da quella attuale.',
    )
  })

  it('traduce registrazioni disabilitate', () => {
    expect(mapAuthError(new Error('Signups not allowed for this instance'))).toBe(
      'Le registrazioni sono chiuse. Contatta chi gestisce l’app.',
    )
  })

  it('traduce email non valida', () => {
    expect(mapAuthError(new Error('Unable to validate email address: invalid format'))).toBe(
      'Inserisci un indirizzo email valido.',
    )
  })

  it('traduce rate limit', () => {
    expect(mapAuthError(new Error('Email rate limit exceeded'))).toBe(
      'Troppi tentativi. Attendi qualche minuto e riprova.',
    )
  })

  it('traduce errori di rete', () => {
    expect(mapAuthError(new Error('Failed to fetch'))).toBe(
      'Impossibile contattare il server. Controlla la connessione e riprova.',
    )
  })

  it('traduce configurazione mancante', () => {
    expect(mapAuthError(new Error('Supabase non configurato'))).toBe(
      'Supabase non è configurato. Esegui npm run env:local e riavvia lo sviluppo.',
    )
  })

  it('ha un fallback generico', () => {
    expect(mapAuthError(new Error('boom'))).toBe('Operazione non riuscita. Riprova.')
  })
})

describe('validatePassword', () => {
  it('accetta una password con tutti i requisiti', () => {
    expect(validatePassword('Spesa-demo-123!')).toBeNull()
    expect(validatePassword('Password1!')).toBeNull()
  })

  it('rifiuta una password troppo corta', () => {
    expect(validatePassword('Corta1!')).toBe(PASSWORD_ERROR)
  })

  it('rifiuta una password senza maiuscola', () => {
    expect(validatePassword('spesa-demo-123!')).toBe(PASSWORD_ERROR)
  })

  it('rifiuta una password senza minuscola', () => {
    expect(validatePassword('SPESA-DEMO-123!')).toBe(PASSWORD_ERROR)
  })

  it('rifiuta una password senza numero', () => {
    expect(validatePassword('Spesa-demo-abc!')).toBe(PASSWORD_ERROR)
  })

  it('rifiuta una password senza simbolo', () => {
    expect(validatePassword('SpesaDemo123')).toBe(PASSWORD_ERROR)
  })
})
