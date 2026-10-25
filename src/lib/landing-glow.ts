/**
 * Preferenza locale per l'effetto luminoso della landing.
 *
 * L'impostazione dell'account è il default (`landingGlow` in Settings), ma la
 * landing è pubblica: chi non ha un account deve poter spegnere l'effetto dal
 * browser. Il valore locale vince sulla landing finché non viene cambiato
 * esplicitamente dalle Impostazioni.
 */

const STORAGE_KEY = 'spesa.landing.glow.v1'

export function readLandingGlow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw !== 'off'
  } catch {
    return true
  }
}

export function writeLandingGlow(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage non disponibile: vale per la sessione corrente.
  }
}
