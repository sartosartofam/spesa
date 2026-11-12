import { expect, test } from '@playwright/test'
import { signInAsDemo, uniqueItemName } from './support/backend'

test.beforeEach(async ({ page }) => {
  await signInAsDemo(page)
})

test('aggiunge, persiste al reload, sposta in storico, annulla e rimuove', async ({ page }) => {
  const name = uniqueItemName('CRUD')
  const mainList = page.getByRole('main')
  const row = () => mainList.getByRole('listitem').filter({ hasText: name })

  await page.getByLabel('Nuovo articolo').fill(name)
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Quantità').fill('3 confezioni')
  await dialog.getByLabel('Categoria').selectOption('Dispensa')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(dialog).toHaveCount(0)

  await expect(row()).toBeVisible()
  await expect(row()).toContainText('3 confezioni')

  // Il reload legge dal database: la scrittura è arrivata davvero al backend.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(row()).toBeVisible()

  await row()
    .getByRole('button', { name: `Segna ${name} come preso` })
    .click()
  await expect(row()).toHaveCount(0)

  await page.getByRole('tab', { name: /Storico/ }).click()
  await expect(row()).toBeVisible()

  await page.getByRole('tab', { name: /Da prendere/ }).click()
  await page.getByRole('button', { name: /^Annulla/ }).click()
  await expect(row()).toBeVisible()

  await row()
    .getByRole('button', { name: `Modifica ${name}` })
    .click()
  page.once('dialog', (confirm) => void confirm.accept())
  await page.getByRole('button', { name: 'Rimuovi articolo' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row()).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(row()).toHaveCount(0)
})

test('aggiunge un articolo urgente e lo segnala in lista', async ({ page }) => {
  const name = uniqueItemName('Urgente')
  const mainList = page.getByRole('main')
  const row = () => mainList.getByRole('listitem').filter({ hasText: name })

  await page.getByLabel('Nuovo articolo').fill(name)
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urgente').check()
  await dialog.getByRole('button', { name: 'Salva' }).click()

  await expect(row()).toContainText('Urgente')
  await expect(row()).toHaveClass(/item--urgent/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(row()).toHaveClass(/item--urgent/)
})
