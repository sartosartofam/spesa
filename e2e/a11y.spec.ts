import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  if (results.violations.length > 0) {
    console.log(
      `\n[${label}] ${results.violations.length} violazioni\n` +
        JSON.stringify(
          results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
          null,
          2,
        ),
    )
  }
  expect(results.violations).toEqual([])
}

test('pagine pubbliche accessibili', async ({ page }) => {
  for (const path of [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/privacy',
  ]) {
    await page.goto(path)
    await scan(page, path)
  }
})

test('landing accessibile anche in tema scuro e su mobile', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await scan(page, 'landing-dark')

  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto('/')
  await scan(page, 'landing-mobile')
})

test('app accessibile: lista, storico e dialog', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)
  await scan(page, 'app')

  await page.getByRole('tab', { name: /Storico/ }).click()
  await scan(page, 'storico')

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await scan(page, 'impostazioni')
})

test('dialog articolo accessibile', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  await page.getByLabel('Nuovo articolo').fill('Accessibilità')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await scan(page, 'item-dialog')
})

test('app accessibile in tema scuro e su mobile', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await mockAuth(page)
  await signInAsDemo(page)
  await scan(page, 'app-dark')

  await page.setViewportSize({ width: 360, height: 780 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await scan(page, 'app-mobile')
})
