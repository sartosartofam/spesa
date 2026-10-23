import { expect, test } from '@playwright/test'

test('aggiunge un articolo con dettagli e lo sposta nello storico', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()

  await page.getByLabel('Nuovo articolo').fill('Test e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Quantità').fill('2 pacchi')
  await dialog.getByLabel('Categoria').selectOption('Dispensa')
  await dialog.getByRole('button', { name: 'Salva' }).click()

  const activeRow = page.getByRole('listitem').filter({ hasText: 'Test e2e' })
  await expect(activeRow).toBeVisible()
  await expect(activeRow).toContainText('2 pacchi')

  await activeRow.getByRole('button', { name: 'Segna Test e2e come preso' }).click()
  await page.getByRole('tab', { name: /Storico/ }).click()

  await expect(page.getByRole('listitem').filter({ hasText: 'Test e2e' })).toBeVisible()
})

test('marca un articolo come urgente e lo filtra', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Nuovo articolo').fill('Urgente e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('È finito').check()
  await dialog.getByRole('button', { name: 'Salva' }).click()

  const mainList = page.getByRole('main')
  const activeRow = mainList.getByRole('listitem').filter({ hasText: 'Urgente e2e' })
  await expect(activeRow).toContainText('Urgente')

  await page.getByRole('button', { name: /Solo urgenti/ }).click()
  await expect(activeRow).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)
})

test('l’aggiunta rapida usa la categoria predefinita', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const settings = page.getByRole('dialog')
  await settings.getByLabel('Aggiunta rapida').check()
  await settings.getByLabel('Categoria predefinita').selectOption('Casa')
  await settings.getByRole('button', { name: 'Salva' }).click()

  await expect(page.getByText(/Aggiunta rapida in/)).toContainText('Casa')

  await page.getByLabel('Nuovo articolo').fill('Sapone e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('main').getByRole('listitem').filter({ hasText: 'Sapone e2e' }),
  ).toBeVisible()
})
