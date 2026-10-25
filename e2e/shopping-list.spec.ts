import { expect, test } from '@playwright/test'
import { mockAuth, signInAsDemo } from './support/auth'

test.beforeEach(async ({ page }) => {
  await mockAuth(page)
  await signInAsDemo(page)
})

test('aggiunge un articolo con dettagli e lo sposta nello storico', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
  await expect(page.getByText('Invio')).toHaveCount(0)

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

  await activeRow.getByRole('button', { name: 'Segna Test e2e come preso' }).click()
  await page.getByRole('tab', { name: /Storico/ }).click()

  await expect(mainList.getByRole('listitem').filter({ hasText: 'Test e2e' })).toBeVisible()
})

test('annulla e ripete un articolo segnato come preso', async ({ page }) => {
  const mainList = page.getByRole('main')
  const undo = page.getByRole('button', { name: /^Annulla/ })
  const redo = page.getByRole('button', { name: /^Ripeti/ })
  const latte = () => mainList.getByRole('listitem').filter({ hasText: 'Latte' })

  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()

  await latte().getByRole('button', { name: 'Segna Latte come preso' }).click()
  await expect(latte()).toHaveCount(0)
  await expect(undo).toBeEnabled()

  await undo.click()
  await expect(latte()).toBeVisible()
  await expect(page.locator('.toast')).toContainText(/Annullato: .*Latte.*segnato come preso/)
  await expect(redo).toBeEnabled()

  await redo.click()
  await expect(latte()).toHaveCount(0)
  await expect(page.locator('.toast')).toContainText('Ripetuto:')
})

test('annulla un articolo eliminato', async ({ page }) => {
  const mainList = page.getByRole('main')
  const pasta = () => mainList.getByRole('listitem').filter({ hasText: 'Pasta' })

  await pasta().getByRole('button', { name: 'Modifica Pasta' }).click()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Rimuovi articolo' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(pasta()).toHaveCount(0)

  await page.getByRole('button', { name: /^Annulla/ }).click()
  await expect(pasta()).toBeVisible()
  await expect(page.locator('.toast')).toContainText('Annullato: eliminazione di')
})

test('annulla e ripete un articolo aggiunto', async ({ page }) => {
  await page.getByLabel('Nuovo articolo').fill('Bozza undo')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Salva' }).click()

  const mainList = page.getByRole('main')
  const row = () => mainList.getByRole('listitem').filter({ hasText: 'Bozza undo' })
  await expect(row()).toBeVisible()

  await page.getByRole('button', { name: /^Annulla/ }).click()
  await expect(row()).toHaveCount(0)

  await page.getByRole('button', { name: /^Ripeti/ }).click()
  await expect(row()).toBeVisible()
})

test('ordina i controlli: tabs, aggiunta, categorie e ricerca', async ({ page }) => {
  const main = page.getByRole('main')
  const controls = page.locator('#mobile-controls-body')

  await expect(page.getByRole('button', { name: 'Aggiungi e filtra' })).toBeHidden()
  await expect(main.getByRole('tablist', { name: 'Viste della lista' })).toBeVisible()
  await expect(main.getByLabel('Nuovo articolo')).toBeVisible()
  await expect(main.getByRole('group', { name: 'Filtra per categoria' })).toBeVisible()
  await expect(main.getByLabel('Cerca articoli')).toBeVisible()

  const order = await controls
    .locator(':scope > *')
    .evaluateAll((elements) => elements.map((element) => element.classList[0]))
  expect(order).toEqual(['tabs', 'quick-add', 'category-chips', 'toolbar'])
})

test('marca un articolo come urgente e lo filtra', async ({ page }) => {
  await page.getByLabel('Nuovo articolo').fill('Urgente e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urgente').check()
  await dialog.getByRole('button', { name: 'Salva' }).click()

  const mainList = page.getByRole('main')
  const activeRow = mainList.getByRole('listitem').filter({ hasText: 'Urgente e2e' })
  await expect(activeRow).toContainText('Urgente')
  await expect(activeRow).toHaveClass(/item--urgent/)
  await expect(mainList.getByRole('heading', { name: 'Urgenti', exact: true })).toHaveCount(0)

  const banner = page.locator('.urgent-banner')
  await banner.getByRole('button', { name: 'Mostra urgenti' }).click()

  await expect(activeRow).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)
  await expect(mainList.getByRole('heading', { name: 'Urgenti', exact: true })).toHaveCount(0)
  await expect(mainList.getByRole('heading', { name: /^Dispensa/ })).toBeVisible()
  await expect(mainList.getByRole('heading', { name: /^Casa/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Togli il filtro Solo urgenti' })).toBeVisible()

  await page.getByRole('button', { name: 'Togli il filtro Solo urgenti' }).click()
  await expect(banner).toBeVisible()
})

test('le chip in alto filtrano una sola categoria', async ({ page }) => {
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

  const mainList = page.getByRole('main')
  const chips = mainList.getByRole('group', { name: 'Filtra per categoria' })
  const casa = chips.getByRole('button', { name: /^Casa/ })
  const dispensa = chips.getByRole('button', { name: /^Dispensa/ })

  await casa.click()
  await expect(casa).toHaveAttribute('aria-pressed', 'true')
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Casa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Dispensa e2e' })).toHaveCount(0)

  await dispensa.click()
  await expect(dispensa).toHaveAttribute('aria-pressed', 'true')
  await expect(casa).toHaveAttribute('aria-pressed', 'false')
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Dispensa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Casa e2e' })).toHaveCount(0)

  await dispensa.click()
  await expect(chips.getByRole('button', { name: 'Tutte' })).toHaveAttribute('aria-pressed', 'true')
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Casa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Dispensa e2e' })).toBeVisible()
})

test('la sidebar filtra più categorie insieme', async ({ page }) => {
  await page.getByLabel('Nuovo articolo').fill('Casa e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Categoria').selectOption('Casa')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByLabel('Nuovo articolo').fill('Dispensa e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Categoria').selectOption('Dispensa')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await expect(dialog).toHaveCount(0)

  const mainList = page.getByRole('main')
  const sidebar = page.getByRole('complementary', { name: 'Riepilogo e controlli' })
  const chips = mainList.getByRole('group', { name: 'Filtra per categoria' })

  await sidebar.getByRole('checkbox', { name: /^Casa/ }).check()
  await sidebar.getByRole('checkbox', { name: /^Dispensa/ }).check()

  await expect(mainList.getByRole('listitem').filter({ hasText: 'Casa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Dispensa e2e' })).toBeVisible()
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)
  await expect(chips.getByRole('button', { name: 'Tutte' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(chips.getByRole('button', { name: /^Casa/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(chips.getByRole('button', { name: /^Dispensa/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  await sidebar.getByRole('button', { name: 'Azzera filtri' }).click()
  await expect(chips.getByRole('button', { name: 'Tutte' })).toHaveAttribute('aria-pressed', 'true')
  await expect(mainList.getByRole('listitem').filter({ hasText: 'Latte' })).toBeVisible()
})

test('l’aggiunta rapida usa la categoria predefinita', async ({ page }) => {
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const settings = page.getByRole('dialog')
  await settings.getByLabel('Aggiunta rapida').check()
  await settings.getByLabel('Categoria predefinita').selectOption('Casa')
  await settings.getByRole('button', { name: 'Chiudi' }).click()

  await expect(page.getByText(/Aggiunta rapida in/)).toContainText('Casa')

  await page.getByLabel('Nuovo articolo').fill('Sapone e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('main').getByRole('listitem').filter({ hasText: 'Sapone e2e' }),
  ).toBeVisible()
})

test('salva le impostazioni alla chiusura e Annulla le scarta', async ({ page }) => {
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  let settings = page.getByRole('dialog')
  await settings.getByLabel('Aggiunta rapida').check()
  await settings.getByRole('button', { name: 'Chiudi' }).click()

  await expect(page.getByText(/Aggiunta rapida in/)).toBeVisible()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  settings = page.getByRole('dialog')
  await expect(settings.getByLabel('Aggiunta rapida')).toBeChecked()

  await settings.getByLabel('Aggiunta rapida').uncheck()
  await settings.getByRole('button', { name: 'Annulla' }).click()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  settings = page.getByRole('dialog')
  await expect(settings.getByLabel('Aggiunta rapida')).toBeChecked()

  await settings.getByLabel('Bagliore che segue il cursore').uncheck()
  await settings.getByRole('button', { name: 'Chiudi' }).click()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('spesa.landing.glow.v1')))
    .toBe('off')

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  settings = page.getByRole('dialog')
  await expect(settings.getByLabel('Bagliore che segue il cursore')).not.toBeChecked()
})

test('le impostazioni usano una sola barra di scorrimento', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.getByRole('button', { name: 'Impostazioni' }).click()

  const settings = page.getByRole('dialog')
  await expect(settings).toBeVisible()

  const scrollable = await settings.evaluate((dialog) =>
    [dialog, ...dialog.querySelectorAll<HTMLElement>('.sheet__body')]
      .filter((element) => {
        const style = getComputedStyle(element)
        return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight
      })
      .map((element) => element.className),
  )

  expect(scrollable).toEqual(['sheet__body'])
})

test('ripristina le impostazioni solo dopo conferma', async ({ page }) => {
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  let settings = page.getByRole('dialog')
  await settings.getByLabel('Aggiunta rapida').check()
  await settings.getByLabel('Categoria predefinita').selectOption('Casa')
  await settings.getByRole('button', { name: 'Chiudi' }).click()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  settings = page.getByRole('dialog')

  page.once('dialog', (dialog) => void dialog.dismiss())
  await settings.getByRole('button', { name: 'Ripristina impostazioni' }).click()
  await expect(settings.getByLabel('Aggiunta rapida')).toBeChecked()
  await expect(settings.getByLabel('Categoria predefinita')).toHaveValue('Casa')

  page.once('dialog', (dialog) => void dialog.accept())
  await settings.getByRole('button', { name: 'Ripristina impostazioni' }).click()
  await expect(settings.getByLabel('Aggiunta rapida')).not.toBeChecked()
  await expect(settings.getByLabel('Categoria predefinita')).toHaveValue('Dispensa')

  await settings.getByRole('button', { name: 'Chiudi' }).click()
  await expect(page.getByText(/Aggiunta rapida in/)).toHaveCount(0)
})

test('permette di creare una categoria personalizzata', async ({ page }) => {
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

test('importa un preset negozio da JSON', async ({ page }) => {
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const settings = page.getByRole('dialog')
  await settings.locator('input[type="file"]').setInputFiles({
    name: 'negozi.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        presets: [{ name: 'Esselunga e2e', order: ['Casa', 'Dispensa'] }],
      }),
    ),
  })

  await expect(settings.getByText(/Preset importati/)).toBeVisible()
  await settings.getByRole('button', { name: 'Chiudi' }).click()

  const imported = await page.evaluate(() => {
    const raw = localStorage.getItem('spesa.settings.v1')
    const parsed = raw
      ? (JSON.parse(raw) as { presets?: Array<{ name?: string }> })
      : { presets: [] }
    return parsed.presets?.some((preset) => preset.name === 'Esselunga e2e') ?? false
  })

  expect(imported).toBe(true)
})

test('esporta i preset negozio in JSON', async ({ page }) => {
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const settings = page.getByRole('dialog')
  const downloadPromise = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Esporta JSON' }).click()

  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('spesa-preset-negozi.json')
})

test('un articolo dello storico reso urgente torna nella lista attiva', async ({ page }) => {
  await page.getByRole('tab', { name: /Storico/ }).click()
  await page.getByRole('button', { name: 'Modifica Caffè' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Urgente').check()
  await dialog.getByRole('button', { name: 'Salva' }).click()

  await page.getByRole('tab', { name: /Da prendere/ }).click()
  const mainList = page.getByRole('main')
  const activeRow = mainList.getByRole('listitem').filter({ hasText: 'Caffè' })
  await expect(activeRow).toBeVisible()
  await expect(activeRow).toContainText('Urgente')
})

test('chiude il dialog cliccando fuori', async ({ page }) => {
  await page.getByLabel('Nuovo articolo').fill('Fuori e2e')
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.mouse.click(8, 8)

  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('filtra con le chip categoria e usa l’avviso urgenze', async ({ page }) => {
  const main = page.getByRole('main')
  const chips = main.getByRole('group', { name: 'Filtra per categoria' })

  await expect(chips.getByRole('button', { name: 'Tutte' })).toHaveAttribute('aria-pressed', 'true')

  await chips.getByRole('button', { name: /^Casa/ }).click()
  await expect(main.getByRole('listitem').filter({ hasText: 'Detersivo piatti' })).toBeVisible()
  await expect(main.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)

  await chips.getByRole('button', { name: 'Tutte' }).click()
  await expect(main.getByRole('listitem').filter({ hasText: 'Latte' })).toBeVisible()

  const banner = page.locator('.urgent-banner')
  await expect(banner).toContainText('Detersivo piatti')
  await banner.getByRole('button', { name: 'Mostra urgenti' }).click()

  await expect(page.locator('.urgent-banner')).toHaveCount(0)
  await expect(main.getByRole('listitem').filter({ hasText: 'Latte' })).toHaveCount(0)
})

test('a 360 px i controlli stanno in un collapse e la lista resta libera', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()

  const toggle = page.getByRole('button', { name: 'Aggiungi e filtra' })
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByLabel('Nuovo articolo')).toBeHidden()
  await expect(page.getByRole('tablist', { name: 'Viste della lista' })).toBeHidden()
  await expect(page.getByRole('group', { name: 'Filtra per categoria' })).toBeHidden()
  await expect(page.getByLabel('Cerca articoli')).toBeHidden()

  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  await toggle.click()
  await expect(page.getByRole('button', { name: 'Nascondi controlli' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.getByLabel('Nuovo articolo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aggiungi', exact: true })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Viste della lista' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Filtra per categoria' })).toBeVisible()
  await expect(page.getByLabel('Cerca articoli')).toBeVisible()

  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: 'Nascondi controlli' }).click()
  await expect(page.getByLabel('Nuovo articolo')).toBeHidden()
})
