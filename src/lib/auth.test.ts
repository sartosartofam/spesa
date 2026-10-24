import { describe, expect, it } from 'vitest'
import { mapAuthError, normalizeEmail } from './auth'

describe('normalizeEmail', () => {
  it('toglie spazi e porta tutto in minuscolo', () => {
    expect(normalizeEmail('  Ada@Example.Test  ')).toBe('ada@example.test')
    expect(normalizeEmail('demo@spesa.test')).toBe('demo@spesa.test')
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

  it('traduce email già registrata', () => {
    expect(mapAuthError(new Error('User already registered'))).toBe(
      'Esiste già un account con questa email. Prova ad accedere.',
    )
  })

  it('traduce password troppo corta', () => {
    expect(mapAuthError(new Error('Password should be at least 8 characters'))).toBe(
      'La password deve avere almeno 8 caratteri.',
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
