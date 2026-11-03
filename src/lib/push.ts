import type { Json } from './database.types'
import { isAllowedPushEndpoint } from './push-endpoint'
import { getSupabase } from './supabase'

export type PushEvent = 'created' | 'urgent'

export type PushErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'not-configured'
  | 'permission-denied'
  | 'permission-dismissed'
  | 'service-worker'
  | 'subscription'
  | 'database'
  | 'send'

export class PushError extends Error {
  readonly code: PushErrorCode

  constructor(code: PushErrorCode) {
    super(code)
    this.name = 'PushError'
    this.code = code
  }
}

/** True quando l'app ha una chiave VAPID pubblica configurata. */
export function hasPushConfiguration(): boolean {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  return typeof key === 'string' && key.trim().length > 0
}

/** True quando il browser e la pagina possono gestire Web Push. */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** True quando la UI può proporre l'opt-in su questo dispositivo. */
export function isPushConfigured(): boolean {
  return hasPushConfiguration() && isPushSupported()
}

export function currentPushPermission(): NotificationPermission | null {
  return isPushSupported() ? Notification.permission : null
}

/** Converte una chiave VAPID base64url nel formato richiesto da PushManager. */
export function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes
}

function mapPushErrorCode(code: PushErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'Questo browser non supporta le notifiche push.'
    case 'insecure':
      return 'Le notifiche richiedono una connessione HTTPS.'
    case 'not-configured':
      return 'Le notifiche push non sono configurate su questa installazione.'
    case 'permission-denied':
      return 'Le notifiche sono bloccate. Riattivale dalle impostazioni del browser.'
    case 'permission-dismissed':
      return 'Permesso notifiche non concesso.'
    case 'service-worker':
      return 'Il service worker non è disponibile. Ricarica l’app e riprova.'
    case 'subscription':
      return 'Non riesco a creare l’iscrizione alle notifiche. Riprova.'
    case 'database':
      return 'Non riesco a salvare l’iscrizione alle notifiche. Riprova.'
    case 'send':
      return 'Non riesco a inviare la notifica.'
  }
}

export function mapPushError(error: unknown): string {
  if (error instanceof PushError) return mapPushErrorCode(error.code)
  return 'Errore imprevisto con le notifiche.'
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new PushError('unsupported')
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration()
    if (existing?.active) return existing

    if (!existing) {
      await navigator.serviceWorker.register('/sw.js')
    }

    return await withTimeout(navigator.serviceWorker.ready, 10_000)
  } catch (error) {
    if (error instanceof PushError) throw error
    throw new PushError('service-worker')
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new PushError('service-worker'))
    }, milliseconds)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

interface StoredPushKeys {
  p256dh: string
  auth: string
}

async function savePushSubscription(
  memberId: string,
  endpoint: string,
  keys: StoredPushKeys,
): Promise<void> {
  const client = getSupabase()
  if (!client) throw new PushError('not-configured')

  const { data: existing, error: lookupError } = await client
    .from('push_subscriptions')
    .select('id')
    .eq('member_id', memberId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (lookupError) throw new PushError('database')

  const jsonKeys: NonNullable<Json> = { p256dh: keys.p256dh, auth: keys.auth }

  if (existing) {
    const { error } = await client
      .from('push_subscriptions')
      .update({ keys: jsonKeys })
      .eq('id', existing.id)
    if (error) throw new PushError('database')
    return
  }

  const { error } = await client.from('push_subscriptions').insert({
    member_id: memberId,
    endpoint,
    keys: jsonKeys,
  })
  if (error) throw new PushError('database')
}

/**
 * Chiede il permesso e iscrive questo dispositivo alle notifiche.
 * Va chiamata da un click: i browser richiedono un gesto utente.
 */
export async function subscribeToPush(memberId: string): Promise<PushSubscription> {
  if (!isPushSupported()) throw new PushError('unsupported')
  if (!hasPushConfiguration()) throw new PushError('not-configured')
  if (window.isSecureContext === false) throw new PushError('insecure')
  if (!memberId) throw new PushError('unsupported')

  let permission: NotificationPermission
  try {
    permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  } catch {
    throw new PushError('permission-dismissed')
  }

  if (permission === 'denied') throw new PushError('permission-denied')
  if (permission !== 'granted') throw new PushError('permission-dismissed')

  const registration = await ensureServiceWorker()
  let subscription: PushSubscription
  try {
    const existing = await registration.pushManager.getSubscription()
    subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(
          String(import.meta.env.VITE_VAPID_PUBLIC_KEY).trim(),
        ),
      }))
  } catch {
    throw new PushError('subscription')
  }

  let keys: Record<string, string> | undefined
  try {
    keys = subscription.toJSON().keys
  } catch {
    throw new PushError('subscription')
  }

  if (!keys?.p256dh || !keys.auth) throw new PushError('subscription')
  if (!isAllowedPushEndpoint(subscription.endpoint)) throw new PushError('subscription')

  await savePushSubscription(memberId, subscription.endpoint, {
    p256dh: keys.p256dh,
    auth: keys.auth,
  })

  return subscription
}

/**
 * Disiscrive questo dispositivo e cancella la riga del membro.
 * Restituisce senza errori se non c'è nulla da rimuovere.
 */
export async function unsubscribeFromPush(memberId: string | null): Promise<void> {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  let databaseError: PushError | null = null
  if (memberId) {
    try {
      const client = getSupabase()
      if (client) {
        const { error } = await client
          .from('push_subscriptions')
          .delete()
          .eq('member_id', memberId)
          .eq('endpoint', subscription.endpoint)
        if (error) databaseError = new PushError('database')
      }
    } catch {
      databaseError = new PushError('database')
    }
  }

  try {
    await subscription.unsubscribe()
  } catch {
    throw new PushError('subscription')
  }

  if (databaseError) throw databaseError
}

/**
 * Chiede alla Edge Function di notificare gli altri membri della famiglia.
 * Non deve mai bloccare l'azione sulla lista: il chiamante ignora gli errori.
 */
export async function sendPushNotification(itemId: string, event: PushEvent): Promise<void> {
  if (!hasPushConfiguration()) return

  const client = getSupabase()
  if (!client) return

  const { error } = await client.functions.invoke('send-push', {
    body: { itemId, event },
  })
  if (error) throw new PushError('send')
}
