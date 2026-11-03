/**
 * Allowlist degli endpoint Web Push supportati dai browser.
 *
 * La stessa regola è applicata dalla Edge Function `send-push`: il client non
 * può fare affidamento solo su questo controllo, perché può essere aggirato
 * chiamando direttamente l'API REST.
 */
const ALLOWED_HOSTS = new Set([
  'android.googleapis.com',
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

const ALLOWED_SUFFIXES = ['notify.windows.com', 'push.apple.com']

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return (
    ALLOWED_HOSTS.has(host) ||
    ALLOWED_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  )
}
