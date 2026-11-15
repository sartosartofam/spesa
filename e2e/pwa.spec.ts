import { expect, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

test('manifest, icone e service worker sono disponibili', async ({ page, request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBe(true)

  const manifest = (await manifestResponse.json()) as {
    icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>
  }
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }),
      expect.objectContaining({
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }),
    ]),
  )

  for (const icon of manifest.icons ?? []) {
    const response = await request.get(icon.src)
    expect(response.ok(), icon.src).toBe(true)
  }

  await page.goto('/')
  await expect
    .poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration())))
    .toBe(true)
})

test('senza chiave VAPID la sezione notifiche resta nascosta', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notifiche' })).toHaveCount(0)
})

test('la shell e la lista restano consultabili offline', async ({ page, context }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  await context.setOffline(true)
  await expect(page.getByText(/Sei offline/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(page.getByText('Latte')).toBeVisible()
  await expect(page.getByText(/Sei offline/)).toBeVisible()

  await context.setOffline(false)
})

test('il precache dalla landing permette di aprire la lista offline', async ({ page, context }) => {
  await mockAuth(page)
  await page.goto('/')

  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  const precache = await page.evaluate(async () => {
    const response = await fetch('/precache.json')
    if (!response.ok) throw new Error('Manifest di precache non disponibile.')

    const manifest = (await response.json()) as { assets?: unknown }
    const assets = Array.isArray(manifest.assets)
      ? manifest.assets.filter((asset): asset is string => typeof asset === 'string')
      : []
    const shellName = (await caches.keys()).find((name) => name.endsWith('-shell'))
    if (!shellName) throw new Error('Cache shell del service worker non disponibile.')

    const shell = await caches.open(shellName)
    const index = await shell.match('/index.html')
    const indexHtml = index ? await index.text() : ''
    const dynamicScripts = assets.filter(
      (asset) => asset.endsWith('.js') && !indexHtml.includes(asset),
    )
    const cachedScripts = await Promise.all(
      dynamicScripts.map(async (asset) =>
        Boolean(await shell.match(new URL(asset, location.origin).href)),
      ),
    )

    return { dynamicScripts, cachedScripts }
  })

  expect(precache.dynamicScripts.length).toBeGreaterThan(0)
  expect(precache.cachedScripts).toEqual(precache.dynamicScripts.map(() => true))

  await signInAsDemo(page)

  // Rimuovi la cache runtime: offline l'app deve arrivare dalla cache shell,
  // popolata dal manifest anche per i chunk assenti dall'HTML della landing.
  await page.evaluate(async () => {
    const runtimeCaches = (await caches.keys()).filter((name) => name.endsWith('-runtime'))
    await Promise.all(runtimeCaches.map((name) => caches.delete(name)))
  })
  await context.setOffline(true)
  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(page.getByText('Latte')).toBeVisible()

  await context.setOffline(false)
})
