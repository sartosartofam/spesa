import { describe, expect, it } from 'vitest'
import { mapAuthError, normalizeEmail, passwordResetRedirectUrl, userDisplayName } from './auth'

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

  it('traduce password troppo corta', () => {
    expect(mapAuthError(new Error('Password should be at least 12 characters'))).toBe(
      'La password deve avere almeno 12 caratteri.',
    )
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
