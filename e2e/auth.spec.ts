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

  await page.goto('/register')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page).toHaveTitle(/Registrati/i)

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

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Esci' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: /lista della spesa di tutta la famiglia/i }),
  ).toBeVisible()

  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
})

test('il logout chiede conferma e Annulla mantiene la sessione', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: 'Esci' }).click()

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByText(DEMO_EMAIL)).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Esci' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('la password non viene mai mostrata nel form', async ({ page }) => {
  await page.goto('/login')
  const password = page.getByLabel('Password')
  await password.fill(DEMO_PASSWORD)
  await expect(password).toHaveAttribute('type', 'password')
})

test('la registrazione pubblica normalizza l’email e chiede la conferma', async ({ page }) => {
  let signUpBody: { email?: string; data?: Record<string, unknown> } | undefined

  await mockAuth(page, {
    onSignUp: (body) => {
      signUpBody = body
    },
  })
  await page.goto('/login')
  await page.getByRole('link', { name: 'Non hai un account? Registrati' }).click()
  await expect(page).toHaveURL(/\/register$/)

  await page.getByLabel('Nome', { exact: true }).fill('Ada')
  await page.getByLabel('Nome della famiglia').fill('Famiglia Ada')
  await page.getByLabel('Email').fill('  Ada@Example.Test  ')
  await page.getByLabel('Password', { exact: true }).fill('password-sicura')
  await page.getByLabel('Conferma password').fill('password-sicura')
  await page.getByRole('button', { name: 'Crea account' }).click()

  await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('ada@example.test')
  await expect(page).toHaveURL(/\/register$/)

  expect(signUpBody?.email).toBe('ada@example.test')
  expect(signUpBody?.data).toMatchObject({
    display_name: 'Ada',
    family_name: 'Famiglia Ada',
    signup_flow: 'public',
  })
})

test('la registrazione rifiuta password diverse senza chiamare il server', async ({ page }) => {
  await page.goto('/register')

  await page.getByLabel('Nome', { exact: true }).fill('Ada')
  await page.getByLabel('Nome della famiglia').fill('Famiglia Ada')
  await page.getByLabel('Email').fill('ada@example.test')
  await page.getByLabel('Password', { exact: true }).fill('password-sicura')
  await page.getByLabel('Conferma password').fill('password-diversa')
  await page.getByRole('button', { name: 'Crea account' }).click()

  await expect(page.getByRole('alert')).toContainText('Le password non coincidono.')
  await expect(page).toHaveURL(/\/register$/)
})

test('font e attribuzione Streamline reggono a 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')

  await expect(
    page.locator('link[href*="fonts.googleapis.com/css2?family=JetBrains+Mono"]'),
  ).toHaveCount(1)
  const landingCredit = page.getByRole('link', { name: /Icone: Streamline/ })
  await expect(landingCredit).toHaveAttribute('href', 'https://streamlinehq.com')
  await expect(landingCredit).toHaveAttribute('target', '_blank')

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)

  await mockAuth(page)
  await signInAsDemo(page)

  await expect(page.getByRole('link', { name: /Icone: Streamline/ })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)
})
