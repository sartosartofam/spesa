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

  const mainList = page.getByRole('main')
  const activeRow = mainList.getByRole('listitem').filter({ hasText: 'Test e2e' })
  await expect(activeRow).toBeVisible()
  await expect(activeRow).toContainText('2 pacchi')

  await activeRow.getByRole('button', { name: 'Preso', exact: true }).click()
  await page.getByRole('tab', { name: /Storico/ }).click()

  await expect(mainList.getByRole('listitem').filter({ hasText: 'Test e2e' })).toBeVisible()
})

test('marca un articolo come urgente e lo filtra', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Nuovo articolo').fill('Urgente e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urgente').check()
  await dialog.getByRole('button', { name: 'Salva' }).click()

  const mainList = page.getByRole('main')
  const activeRow = mainList.getByRole('listitem').filter({ hasText: 'Urgente e2e' })
  await expect(activeRow).toContainText('Urgente')

  await page.getByRole('button', { name: /Filtri/ }).click()
  const filters = page.getByRole('dialog')
  await filters.getByRole('checkbox', { name: /Solo urgenti/ }).check()
  await filters.getByRole('button', { name: 'Applica' }).click()

  await expect(activeRow).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)
})

test('filtra per più categorie contemporaneamente', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Nuovo articolo').fill('Casa e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Categoria').selectOption('Casa')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByLabel('Nuovo articolo').fill('Dispensa e2e')
  await expect(page.getByLabel('Nuovo articolo')).toHaveValue('Dispensa e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Categoria').selectOption('Dispensa')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole('button', { name: /Filtri/ }).click()
  const filters = page.getByRole('dialog')
  await filters.getByRole('checkbox', { name: /Casa/ }).check()
  await filters.getByRole('checkbox', { name: /Dispensa/ }).check()
  await filters.getByRole('button', { name: 'Applica' }).click()

  const mainList = page.getByRole('main')
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Casa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Dispensa e2e' })).toBeVisible()
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

test('permette di creare una categoria personalizzata', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Nuovo articolo').fill('Cornetti e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Categoria').selectOption('__new__')
  await dialog.getByLabel('Nuova categoria').fill('Panetteria')
  await dialog.getByRole('button', { name: 'Crea' }).click()

  await expect(dialog.getByLabel('Categoria')).toHaveValue('Panetteria')
  await dialog.getByRole('button', { name: 'Salva' }).click()

  await expect(
    page.getByRole('main').getByRole('listitem').filter({ hasText: 'Cornetti e2e' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /Panetteria/ })).toBeVisible()
})

test('chiude il dialog cliccando fuori', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Nuovo articolo').fill('Fuori e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.mouse.click(8, 8)

  await expect(page.getByRole('dialog')).toHaveCount(0)
})
