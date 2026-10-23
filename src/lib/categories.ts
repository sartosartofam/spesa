/**
 * Categorie condivise da UI e dati.
 *
 * Lo schema le salva come testo libero: questa lista è il contratto della UI
 * finché non arriverà una normalizzazione lato database.
 */

export const CATEGORIES = [
  'Frutta e verdura',
  'Freschi',
  'Dispensa',
  'Surgelati',
  'Bevande',
  'Casa',
  'Altro',
] as const

export type Category = (typeof CATEGORIES)[number]

export const DEFAULT_CATEGORY: Category = 'Dispensa'

export function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Altro'
}

/** Ordine di visualizzazione delle categorie; le categorie ignote vanno in fondo. */
export function categoryRank(category: string): number {
  const index = CATEGORIES.indexOf(category as Category)
  return index === -1 ? CATEGORIES.length : index
}
