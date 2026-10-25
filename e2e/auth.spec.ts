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

  const viewport = page.viewportSize()
  const hero = page.locator('.landing__hero')
  const heroBox = await hero.boundingBox()
  expect(heroBox?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 100)

  const nextSectionBox = await page.locator('#come-funziona').boundingBox()
  expect(nextSectionBox?.y).toBeGreaterThan(viewport?.height ?? 0)

  async function glowPosition() {
    return hero.evaluate((element) => ({
      x: Number.parseFloat(element.style.getPropertyValue('--glow-x')),
      y: Number.parseFloat(element.style.getPropertyValue('--glow-y')),
      width: element.clientWidth,
      height: element.clientHeight,
    }))
  }

  await expect
    .poll(async () => {
      const glow = await glowPosition()
      return Math.abs(glow.x - glow.width / 2) < 2 && Math.abs(glow.y - glow.height / 2) < 2
    })
    .toBe(true)

  await page.mouse.move(200, 200)
  await expect
    .poll(
      async () => {
        const glow = await glowPosition()
        return Math.abs(glow.x - 200) < 12 && Math.abs(glow.y - 200) < 12
      },
      { timeout: 4_000 },
    )
    .toBe(true)

  await page.mouse.move(420, 200)
  await expect
    .poll(
      async () => {
        const glow = await glowPosition()
        return Math.abs(glow.x - 420) < 10 && Math.abs(glow.y - 200) < 10
      },
      { timeout: 800 },
    )
    .toBe(true)

  await hero.dispatchEvent('pointerleave')
  await expect
    .poll(
      async () => {
        const glow = await glowPosition()
        return Math.abs(glow.x - glow.width / 2) < 12 && Math.abs(glow.y - glow.height / 2) < 15
      },
      { timeout: 5_000 },
    )
    .toBe(true)

  await expect(page.getByText('Invio')).toHaveCount(0)

  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  const robotsText = await robots.text()
  expect(robotsText).toContain('User-agent: *')
  expect(robotsText).toContain('Allow: /')
  expect(robotsText).not.toContain('Disallow')
})

test('la landing permette di spegnere il bagliore e ricorda la scelta', async ({ page }) => {
  await page.goto('/')

  const hero = page.locator('.landing__hero')
  const toggle = page.getByRole('button', { name: 'Effetto cursore' })

  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(hero).toHaveAttribute('data-glow', 'on')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(hero).toHaveAttribute('data-glow', 'off')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('spesa.landing.glow.v1')))
    .toBe('off')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Effetto cursore' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.locator('.landing__hero')).toHaveAttribute('data-glow', 'off')

  await page.goto('/questa-pagina-non-esiste')
  await expect(page.locator('.not-found-shell')).toHaveAttribute('data-glow', 'off')
})

test('la landing cambia palette e segue chiaro/scuro del sistema', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const html = page.locator('html')
  const background = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
  const themeColor = page.locator('meta[name="theme-color"]')
  const green = page.getByRole('button', { name: 'Verde' })

  await expect(html).toHaveAttribute('data-theme', 'yellow')
  expect(await background()).toBe('#fbf7e8')
  await expect(themeColor).toHaveAttribute('content', '#8a6500')
  await expect(green).toHaveAttribute('aria-pressed', 'false')

  await green.click()
  await expect(html).toHaveAttribute('data-theme', 'green')
  await expect(green).toHaveAttribute('aria-pressed', 'true')
  expect(await background()).toBe('#f6f7f5')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('spesa.theme.v1'))).toBe('green')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'green')
  expect(await background()).toBe('#f6f7f5')

  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await background()).toBe('#121714')
  await expect(themeColor).toHaveAttribute('content', '#121714')

  await page.getByRole('button', { name: 'Giallo' }).click()
  await expect(html).toHaveAttribute('data-theme', 'yellow')
  expect(await background()).toBe('#17140c')
  await expect(themeColor).toHaveAttribute('content', '#17140c')

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(noOverflow).toBe(true)
})

test('la privacy è pubblica, indicizzabile e raggiungibile dal footer', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page).toHaveTitle(/Privacy/i)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  await expect(page.getByRole('heading', { level: 1, name: 'Informativa privacy' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Quali dati trattiamo/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ciao@spesa.example' }).first()).toHaveAttribute(
    'href',
    'mailto:ciao@spesa.example',
  )
  await expect(page.getByRole('link', { name: /Repository GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/sartosartofam/spesa',
  )
})

test('la pagina 404 mostra il codice e riporta alla home', async ({ page }) => {
  await page.goto('/questa-pagina-non-esiste')

  await expect(page).toHaveTitle(/Pagina non trovata/i)
  await expect(page.locator('.not-found__code')).toHaveText('404')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Questa pagina non esiste.' }),
  ).toBeVisible()

  const shell = page.locator('.not-found-shell')
  await expect(shell).toHaveAttribute('data-glow', 'on')
  await expect
    .poll(async () => {
      const glow = await shell.evaluate((element) => ({
        x: Number.parseFloat(element.style.getPropertyValue('--glow-x')),
        width: element.clientWidth,
      }))
      return Math.abs(glow.x - glow.width / 2) < 2
    })
    .toBe(true)

  await page.mouse.move(140, 180)
  await expect
    .poll(
      async () => {
        const glow = await shell.evaluate((element) => ({
          x: Number.parseFloat(element.style.getPropertyValue('--glow-x')),
          width: element.clientWidth,
        }))
        return glow.x < glow.width / 2 - 20
      },
      { timeout: 2_000 },
    )
    .toBe(true)

  await page.getByRole('link', { name: 'Torna alla pagina iniziale' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: /lista della spesa di tutta la famiglia/i }),
  ).toBeVisible()
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
  const people = page.getByRole('list', { name: 'Persone nella lista' })
  await expect(people.getByText('Demo', { exact: true })).toBeVisible()
  await expect(page.getByText(DEMO_EMAIL)).toHaveCount(0)

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
  await expect(
    page.getByRole('list', { name: 'Persone nella lista' }).getByText('Demo', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(DEMO_EMAIL)).toHaveCount(0)

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
  const landingCredit = page.getByRole('link', { name: /Streamline Pixel/ })
  await expect(landingCredit).toHaveAttribute('href', 'https://streamlinehq.com')
  await expect(landingCredit).toHaveAttribute('target', '_blank')

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)

  await mockAuth(page)
  await signInAsDemo(page)

  await expect(page.getByRole('link', { name: /Streamline Pixel/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const settingsCredit = page.getByRole('dialog').getByRole('link', { name: /Streamline/ })
  await settingsCredit.scrollIntoViewIfNeeded()
  await expect(settingsCredit).toHaveAttribute('href', 'https://streamlinehq.com')
  await expect(settingsCredit).toHaveAttribute('target', '_blank')

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)
})
