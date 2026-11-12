import { expect, test } from '@playwright/test'
import { DEMO_EMAIL, signInAsDemo } from './support/backend'

test('login reale, famiglia del seed e sessione persistente al reload', async ({ page }) => {
  await signInAsDemo(page)

  // Famiglia e membri arrivano dal database, non dal mock.
  await expect(page.locator('.app__footer')).toContainText('Famiglia Demo')
  const people = page.getByRole('list', { name: 'Persone nella lista' })
  await expect(people.getByText('Demo', { exact: true })).toBeVisible()

  // Articolo del seed letto dal backend.
  await expect(
    page.getByRole('main').getByRole('listitem').filter({ hasText: 'Mele' }),
  ).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(page.getByText('modalità demo · dati locali')).toHaveCount(0)

  // Logout reale: la sessione sparisce anche per le route protette.
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Esci' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
})

test('credenziali sbagliate: errore reale di Supabase, senza entrare', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(DEMO_EMAIL)
  await page.getByLabel('Password').fill('password-sbagliata')
  await page.getByRole('button', { name: 'Accedi' }).click()

  await expect(page.getByRole('alert')).toContainText('Email o password non corretti.')
  await expect(page).toHaveURL(/\/login$/)
})
