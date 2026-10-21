import { expect, test } from '@playwright/test'

test('aggiunge un articolo e lo sposta nello storico', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()

  await page.getByLabel('Nuovo articolo').fill('Test e2e')
  await page.getByRole('button', { name: 'Aggiungi' }).click()

  const activeRow = page.getByRole('listitem').filter({ hasText: 'Test e2e' })
  await expect(activeRow).toBeVisible()

  await activeRow.getByRole('button', { name: 'Segna Test e2e come preso' }).click()
  await page.getByRole('tab', { name: /Storico/ }).click()

  await expect(page.getByRole('listitem').filter({ hasText: 'Test e2e' })).toBeVisible()
})
