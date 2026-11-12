import { deleteE2eItems } from './support/backend'

/**
 * Pulizia globale dopo la suite con backend reale: rimuove dal database locale
 * gli articoli creati dai test, anche se una run precedente è stata interrotta.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    const deleted = await deleteE2eItems()
    if (deleted > 0) {
      console.log(`[e2e-backend] rimossi ${deleted} articoli di test.`)
    }
  } catch (error) {
    // La pulizia è di cortesia: non nasconde l'esito dei test.
    console.warn(
      `[e2e-backend] pulizia finale non riuscita: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
