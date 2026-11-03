import { useCallback, useEffect, useState } from 'preact/hooks'
import {
  currentPushPermission,
  getCurrentPushSubscription,
  isPushConfigured,
  mapPushError,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'

export function usePushNotifications(memberId: string) {
  const configured = isPushConfigured()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(configured)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(currentPushPermission)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!configured || !memberId) {
      setLoading(false)
      return
    }

    setLoading(true)
    getCurrentPushSubscription()
      .then((subscription) => {
        if (cancelled) return
        setEnabled(Boolean(subscription))
        setPermission(currentPushPermission())
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(mapPushError(loadError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [configured, memberId])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await subscribeToPush(memberId)
      setEnabled(true)
      setPermission(currentPushPermission())
      setMessage('Notifiche attive su questo dispositivo.')
    } catch (enableError) {
      setError(mapPushError(enableError))
      setPermission(currentPushPermission())
    } finally {
      setBusy(false)
    }
  }, [memberId])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await unsubscribeFromPush(memberId)
      setEnabled(false)
      setPermission(currentPushPermission())
      setMessage('Notifiche disattivate su questo dispositivo.')
    } catch (disableError) {
      setError(mapPushError(disableError))
      try {
        setEnabled(Boolean(await getCurrentPushSubscription()))
        setPermission(currentPushPermission())
      } catch {
        // Se anche la lettura fallisce, lascia lo stato precedente.
      }
    } finally {
      setBusy(false)
    }
  }, [memberId])

  return {
    configured,
    enabled,
    loading,
    busy,
    permission,
    error,
    message,
    enable,
    disable,
  }
}
