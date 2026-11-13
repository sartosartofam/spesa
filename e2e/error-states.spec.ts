import { expect, type Page, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

/**
 * Stati di errore delle scritture, in modalità mock.
 *
 * Il repository mock salva in `localStorage`: questi test ne rompono le
 * scritture (come farebbe uno storage pieno o bloccato dal browser) per
 * verificare che l'interfaccia non butti via il lavoro dell'utente.
 */

const FAIL_FLAG = '__spesaFailItemWrites'
const ITEMS_KEY = 'spesa.mock.items.v2'

async function installWriteFailure(page: Page) {
  await page.addInitScript(
    ({ flag, key }) => {
      const original = Storage.prototype.setItem
      Object.defineProperty(window, flag, { value: false, writable: true, configurable: true })
      Storage.prototype.setItem = function setItem(
        this: Storage,
        storageKey: string,
        value: string,
      ) {
        if ((window as unknown as Record<string, boolean>)[flag] === true && storageKey === key) {
          throw new Error('QuotaExceededError')
        }
        return original.call(this, storageKey, value)
      }
    },
    { flag: FAIL_FLAG, key: ITEMS_KEY },
  )
}

async function setWriteFailure(page: Page, failing: boolean) {
  await page.evaluate(
    ({ flag, failing }) => {
      ;(window as unknown as Record<string, boolean>)[flag] = failing
    },
    { flag: FAIL_FLAG, failing },
  )
}

test('errore di salvataggio: il dialog resta aperto e il testo non si perde', async ({ page }) => {
  await installWriteFailure(page)
  await mockAuth(page)
  await signInAsDemo(page)

  await page.getByLabel('Nuovo articolo').fill('Zucchero')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Nome')).toHaveValue('Zucchero')

  await setWriteFailure(page, true)
  await dialog.getByRole('button', { name: 'Salva' }).click()

  // Il dialog non si chiude, il messaggio è dentro il dialog e il testo resta.
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText(
    'Impossibile salvare i dati sul dispositivo',
  )
  await expect(dialog.getByLabel('Nome')).toHaveValue('Zucchero')
  await expect(page.getByRole('button', { name: 'Modifica Zucchero' })).toHaveCount(0)

  // Con lo storage di nuovo funzionante basta riprovare: nessun dato re-inserito a mano.
  await setWriteFailure(page, false)
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Modifica Zucchero' })).toBeVisible()
})

test('errore di eliminazione: il dialog resta aperto con il messaggio', async ({ page }) => {
  await installWriteFailure(page)
  page.on('dialog', (confirm) => void confirm.accept())
  await mockAuth(page)
  await signInAsDemo(page)

  await page.getByRole('button', { name: 'Modifica Pasta' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await setWriteFailure(page, true)
  await dialog.getByRole('button', { name: 'Rimuovi articolo' }).click()

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText(
    'Impossibile salvare i dati sul dispositivo',
  )
  await expect(page.getByRole('button', { name: 'Modifica Pasta' })).toBeVisible()
})

test('aggiunta rapida fallita: il nome resta nel campo per riprovare', async ({ page }) => {
  await installWriteFailure(page)
  await mockAuth(page)
  await signInAsDemo(page)

  // Attiva l'aggiunta rapida: il pulsante "Aggiungi" salva senza aprire il dialog.
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  await page.getByLabel('Aggiunta rapida').check()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await setWriteFailure(page, true)
  const input = page.getByLabel('Nuovo articolo')
  await input.fill('Biscotti')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Impossibile salvare i dati sul dispositivo')
  await expect(input).toHaveValue('Biscotti')

  await setWriteFailure(page, false)
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Modifica Biscotti' })).toBeVisible()
  await expect(input).toHaveValue('')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
