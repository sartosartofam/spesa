import { expect, test } from '@playwright/test'
import { signInAsDemo, uniqueItemName } from './support/backend'

test('due dispositivi vedono aggiunta e rimozione via realtime', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  try {
    await Promise.all([signInAsDemo(pageA), signInAsDemo(pageB)])

    const seededItem = (page: typeof pageA) =>
      page.getByRole('main').getByRole('listitem').filter({ hasText: 'Mele' })
    await expect(seededItem(pageA)).toBeVisible()
    await expect(seededItem(pageB)).toBeVisible()

    // La lista è caricata; diamo al WebSocket il tempo di sottoscriversi al
    // canale Realtime prima di generare l'evento.
    await pageB.waitForTimeout(1_000)

    const name = uniqueItemName('Realtime')
    const rowInB = pageB.getByRole('main').getByRole('listitem').filter({ hasText: name })

    await pageA.getByLabel('Nuovo articolo').fill(name)
    await pageA.getByRole('button', { name: 'Aggiungi', exact: true }).click()
    await pageA.getByRole('dialog').getByRole('button', { name: 'Salva' }).click()
    await expect(pageA.getByRole('dialog')).toHaveCount(0)

    await expect(rowInB).toBeVisible({ timeout: 15_000 })

    // La rimozione da B arriva ad A senza reload.
    await rowInB.getByRole('button', { name: `Modifica ${name}` }).click()
    pageB.once('dialog', (confirm) => void confirm.accept())
    await pageB.getByRole('button', { name: 'Rimuovi articolo' }).click()
    await expect(pageB.getByRole('dialog')).toHaveCount(0)

    await expect(
      pageA.getByRole('main').getByRole('listitem').filter({ hasText: name }),
    ).toHaveCount(0, { timeout: 15_000 })
  } finally {
    await contextA.close()
    await contextB.close()
  }
})
