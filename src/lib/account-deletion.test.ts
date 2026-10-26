import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLocalAppData, deleteCurrentAccount, mapDeleteAccountError } from './account-deletion'

vi.mock('./data', () => ({ isLiveData: false }))

describe('cancellazione account', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('in modalità mock elimina solo i dati applicativi locali', async () => {
    localStorage.setItem('spesa.mock.items.v2', '[]')
    localStorage.setItem('spesa.settings.v1', '{}')
    localStorage.setItem('sb-test-auth-token', 'sessione')

    await deleteCurrentAccount()

    expect(localStorage.getItem('spesa.mock.items.v2')).toBeNull()
    expect(localStorage.getItem('spesa.settings.v1')).toBeNull()
    expect(localStorage.getItem('sb-test-auth-token')).toBe('sessione')
  })

  it('non tocca chiavi di altri prefissi', () => {
    localStorage.setItem('spesa.settings.v1', '{}')
    localStorage.setItem('altro-tema', 'verde')

    clearLocalAppData()

    expect(localStorage.getItem('spesa.settings.v1')).toBeNull()
    expect(localStorage.getItem('altro-tema')).toBe('verde')
  })

  it('mappa gli errori senza esporre dettagli tecnici', () => {
    expect(mapDeleteAccountError(new Error('JWT expired'))).toMatch(/sessione scaduta/i)
    expect(mapDeleteAccountError({ message: 'JWT expired' })).toMatch(/sessione scaduta/i)
    expect(mapDeleteAccountError(new Error('Failed to fetch'))).toMatch(/connessione/i)
    expect(mapDeleteAccountError(new Error('boom'))).toMatch(/non riuscita/i)
  })
})
