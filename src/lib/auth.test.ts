import { describe, expect, it } from 'vitest'
import { mapAuthError } from './auth'

describe('mapAuthError', () => {
  it('traduce credenziali errate', () => {
    expect(mapAuthError(new Error('Invalid login credentials'))).toBe(
      'Email o password non corretti.',
    )
  })

  it('traduce email non confermata', () => {
    expect(mapAuthError(new Error('Email not confirmed'))).toBe(
      'Email non confermata. Chiedi a chi gestisce la famiglia di confermarla.',
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
    expect(mapAuthError(new Error('boom'))).toBe('Accesso non riuscito. Riprova.')
  })
})
