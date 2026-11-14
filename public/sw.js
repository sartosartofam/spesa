/*
 * Service worker della PWA.
 *
 * Strategia volutamente semplice e senza build step:
 * - navigation: network first, fallback all'app shell in cache;
 * - asset statici same-origin: cache first, aggiornati in background alla prima
 *   richiesta dopo un deploy.
 *
 * Le API Supabase non passano dal service worker: la cache contiene solo
 * l'interfaccia, mai risposte REST o dati di altre famiglie.
 */
// Cambiare VERSION è parte del deploy: la activate cancella le cache vecchie,
// quindi la nuova shell (e il manifest di precache) viene riscaricata.
const VERSION = 'spesa-v2'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`
const PRECACHE_MANIFEST = '/precache.json'

const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/private-noindex.js',
]

const API_PREFIXES = ['/auth/', '/rest/', '/realtime/', '/functions/', '/storage/']

/** Asset da index.html: usato solo se il manifest di precache non c'è. */
async function assetsFromIndex(cache) {
  const index = await cache.match('/index.html')
  if (!index) return []

  const html = await index.text()
  return [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))]
}

/**
 * Legge l'elenco degli asset emesso a build (`precache.json`).
 *
 * Serve perché l'app è un chunk caricato su richiesta: non compare in
 * `index.html`, quindi senza questo elenco resterebbe fuori dalla cache e chi
 * apre `/app` offline dopo un deploy nuovo vedrebbe solo il caricamento.
 */
async function assetsFromManifest() {
  try {
    const response = await fetch(PRECACHE_MANIFEST, { cache: 'no-store' })
    if (!response.ok) return []
    const data = await response.json()
    const assets = Array.isArray(data?.assets) ? data.assets : []
    return assets.filter((url) => typeof url === 'string' && url.startsWith('/assets/'))
  } catch {
    return []
  }
}

/**
 * Precacha shell e bundle. Un asset mancante non deve far fallire
 * l'installazione: meglio un service worker aggiornato con una cache parziale
 * (la strategia cache-first recupera alla prima richiesta) che uno vecchio
 * bloccato per sempre.
 */
async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE)
  await cache.addAll(SHELL)

  const assets = await assetsFromManifest()
  const list = assets.length > 0 ? assets : await assetsFromIndex(cache)
  if (list.length === 0) return

  try {
    await cache.addAll(list)
  } catch {
    // Ripiego: aggiungiamo i file uno alla volta, ignorando i singoli errori.
    await Promise.all(list.map((url) => cache.add(url).catch(() => undefined)))
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(?:css|js|woff2?|png|svg|webmanifest|ico)$/i.test(url.pathname)
  )
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    return (
      (await cache.match('/index.html')) ??
      (await cache.match('/')) ??
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    )
  }
}

async function cacheFirstAsset(request) {
  for (const name of [SHELL_CACHE, RUNTIME_CACHE]) {
    const cached = await (await caches.open(name)).match(request.url, { ignoreVary: true })
    if (cached) return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirstAsset(request))
  }
})

function safeNotificationPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/app'
}

function pushNotificationData(event) {
  const fallback = {
    title: 'Spesa',
    body: 'La lista è stata aggiornata.',
    url: '/app',
    tag: 'spesa-update',
  }

  if (!event.data) return fallback

  try {
    const payload = event.data.json()
    if (typeof payload !== 'object' || payload === null) return fallback
    return {
      title:
        typeof payload.title === 'string' && payload.title.trim()
          ? payload.title.trim().slice(0, 80)
          : fallback.title,
      body:
        typeof payload.body === 'string' && payload.body.trim()
          ? payload.body.trim().slice(0, 200)
          : fallback.body,
      url: safeNotificationPath(payload.url),
      tag:
        typeof payload.tag === 'string' && payload.tag.trim()
          ? payload.tag.trim().slice(0, 64)
          : fallback.tag,
    }
  } catch {
    return fallback
  }
}

self.addEventListener('push', (event) => {
  const data = pushNotificationData(event)

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = safeNotificationPath(event.notification.data?.url)
  const target = new URL(path, self.location.origin)

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clients) {
        const current = new URL(client.url)
        if (current.origin === target.origin && current.pathname === target.pathname) {
          await client.focus()
          return
        }
      }

      await self.clients.openWindow(target.href)
    })(),
  )
})
