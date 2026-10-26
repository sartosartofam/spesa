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
const VERSION = 'spesa-v1'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`

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

async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE)
  await cache.addAll(SHELL)

  // Gli asset hanno nomi hash generati da Vite: li leggiamo dall'index già in
  // cache così la shell è completa anche al primo avvio offline.
  const index = await cache.match('/index.html')
  if (!index) return

  const html = await index.text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
  if (assets.length > 0) {
    await cache.addAll([...new Set(assets)])
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
