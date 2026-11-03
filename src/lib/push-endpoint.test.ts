import { describe, expect, it } from 'vitest'
import { isAllowedPushEndpoint } from './push-endpoint'

describe('isAllowedPushEndpoint', () => {
  it('accetta gli endpoint dei servizi push noti', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/wp/abc')).toBe(true)
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(
      true,
    )
    expect(isAllowedPushEndpoint('https://web.push.apple.com/abc')).toBe(true)
    expect(isAllowedPushEndpoint('https://wns2-abc.notify.windows.com/w/?token=abc')).toBe(true)
    expect(isAllowedPushEndpoint('https://android.googleapis.com/gcm/send/abc')).toBe(true)
  })

  it('rifiuta host, protocolli e URL arbitrari', () => {
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/wp/abc')).toBe(false)
    expect(isAllowedPushEndpoint('https://example.com/push')).toBe(false)
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.test/wp/abc')).toBe(false)
    expect(isAllowedPushEndpoint('not-a-url')).toBe(false)
    expect(isAllowedPushEndpoint('')).toBe(false)
  })
})
