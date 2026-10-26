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
