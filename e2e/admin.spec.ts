import { expect, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

/**
 * Il pannello admin esiste solo in un chunk separato e non è linkato da nessuna
 * vista: questi test verificano che da fuori si veda la 404 e che in modalità
 * demo la pagina lo dica, invece di mostrare numeri finti. I dati reali
 * arrivano da `admin_overview()` e sono coperti dai test pgTAP e dalla
 * verifica manuale sul Supabase locale.
 */

test('/admin da anonimo resta una 404 e non rivela il pannello', async ({ page }) => {
  await page.goto('/admin')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Questa pagina non esiste.' }),
  ).toBeVisible()
  await expect(page).toHaveTitle(/Pagina non trovata/i)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.getByRole('heading', { name: 'Salute del progetto' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/admin$/)
})

test('in modalità demo il pannello spiega che serve il backend Supabase', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockAuth(page)
  await signInAsDemo(page)

  await page.goto('/admin')

  await expect(page.getByRole('heading', { level: 1, name: 'Salute del progetto' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Modalità demo' })).toBeVisible()
  await expect(page.getByText(/aggregati del database Supabase/)).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')

  // Solo aggregati: nessun ingresso al pannello e nessun dato della famiglia.
  await expect(page.getByRole('link', { name: /admin/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aggiorna' })).toHaveCount(0)

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)

  await page.getByRole('button', { name: 'Apri la lista' }).click()
  await expect(page).toHaveURL(/\/app$/)
})
