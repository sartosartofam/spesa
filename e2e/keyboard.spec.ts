import { expect, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

test('tab della lista: frecce, Home/End e roving tabindex', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  const activeTab = page.getByRole('tab', { name: /Da prendere/ })
  const historyTab = page.getByRole('tab', { name: /Storico/ })

  await expect(activeTab).toHaveAttribute('aria-selected', 'true')
  await expect(activeTab).toHaveAttribute('tabindex', '0')
  await expect(historyTab).toHaveAttribute('tabindex', '-1')

  await activeTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(historyTab).toBeFocused()
  await expect(historyTab).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(activeTab).toBeFocused()
  await expect(activeTab).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('End')
  await expect(historyTab).toBeFocused()
  await expect(historyTab).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('Home')
  await expect(activeTab).toBeFocused()
  await expect(activeTab).toHaveAttribute('aria-selected', 'true')

  // Il pannello è collegato ai tab con aria-controls/aria-labelledby.
  const panel = page.locator('#list-tabpanel')
  await expect(panel).toHaveAttribute('role', 'tabpanel')
  await expect(activeTab).toHaveAttribute('aria-controls', 'list-tabpanel')
  await expect(panel).toHaveAttribute('aria-labelledby', 'tab-active')
  await page.keyboard.press('ArrowRight')
  await expect(panel).toHaveAttribute('aria-labelledby', 'tab-history')
})

test('Escape riporta il focus al trigger nei dialog', async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)

  // Dialog impostazioni: chiuso con Escape, il focus torna sul pulsante che lo ha aperto.
  const settings = page.getByRole('button', { name: 'Impostazioni' })
  await settings.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(settings).toBeFocused()

  // Dialog articolo: aperto dal pulsante "Aggiungi", che dopo l'invio resta
  // disabilitato; il focus va sul campo rapido, pronto per il prossimo articolo.
  await page.getByLabel('Nuovo articolo').fill('Focus')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Nuovo articolo')).toBeFocused()

  // Aperto da una riga della lista, il focus torna sulla riga stessa.
  const row = page.getByRole('button', { name: 'Modifica Pasta' })
  await row.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toBeFocused()
})
