import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  base64UrlToUint8Array,
  hasPushConfiguration,
  isPushConfigured,
  mapPushError,
  PushError,
} from './push'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('base64UrlToUint8Array', () => {
  it('decodifica base64url senza padding', () => {
    expect(Array.from(base64UrlToUint8Array('aGVsbG8'))).toEqual([104, 101, 108, 108, 111])
    expect(Array.from(base64UrlToUint8Array('-_8'))).toEqual([251, 255])
  })
})

describe('configurazione push', () => {
  it('richiede una chiave VAPID pubblica non vuota', () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    expect(hasPushConfiguration()).toBe(false)

    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '  chiave-pubblica  ')
    expect(hasPushConfiguration()).toBe(true)
  })

  it('non propone la UI se il browser non supporta PushManager', () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'chiave-pubblica')
    expect(isPushConfigured()).toBe(false)
  })
})

describe('mapPushError', () => {
  it('traduce gli errori noti in messaggi utente', () => {
    expect(mapPushError(new PushError('permission-denied'))).toBe(
      'Le notifiche sono bloccate. Riattivale dalle impostazioni del browser.',
    )
    expect(mapPushError(new PushError('service-worker'))).toBe(
      'Il service worker non è disponibile. Ricarica l’app e riprova.',
    )
  })

  it('non espone dettagli tecnici per errori sconosciuti', () => {
    expect(mapPushError(new Error('ECONNRESET su endpoint segreto'))).toBe(
      'Errore imprevisto con le notifiche.',
    )
  })
})
