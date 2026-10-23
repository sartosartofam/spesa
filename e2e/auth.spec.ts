import { expect, test } from '@playwright/test'
import { DEMO_EMAIL, DEMO_PASSWORD, mockAuth, signInAsDemo } from './support/auth'

test('la landing pubblica è indicizzabile e robots.txt è permissivo', async ({ page, request }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: /lista della spesa di tutta la famiglia/i }),
  ).toBeVisible()
  await expect(page).toHaveTitle(/lista della spesa condivisa per famiglie/i)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /gratuita, senza pubblicità/i,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')

  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  const robotsText = await robots.text()
  expect(robotsText).toContain('User-agent: *')
  expect(robotsText).toContain('Allow: /')
  expect(robotsText).not.toContain('Disallow')
})

test('login e area privata sono noindex, l’area privata richiede accesso', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page).toHaveTitle(/Accedi/i)

  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})

test('mostra un errore con credenziali sbagliate', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/login')

  await page.getByLabel('Email').fill('demo@spesa.test')
  await page.getByLabel('Password').fill('password-sbagliata')
  await page.getByRole('button', { name: 'Accedi' }).click()

  await expect(page.getByRole('alert')).toContainText('Email o password non corretti.')
  await expect(page).toHaveURL(/\/login$/)
})

test('login, sessione persistente al reload e logout', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.getByText(DEMO_EMAIL)).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()

  await page.getByRole('button', { name: 'Esci' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: /lista della spesa di tutta la famiglia/i }),
  ).toBeVisible()

  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
})

test('la password non viene mai mostrata nel form', async ({ page }) => {
  await page.goto('/login')
  const password = page.getByLabel('Password')
  await password.fill(DEMO_PASSWORD)
  await expect(password).toHaveAttribute('type', 'password')
})
