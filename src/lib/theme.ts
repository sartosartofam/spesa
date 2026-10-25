import { normalizeTheme, type ThemeId } from './settings'

export type ColorScheme = 'light' | 'dark'

const DEVICE_THEME_KEY = 'spesa.theme.v1'

const THEME_COLORS: Record<ThemeId, Record<ColorScheme, string>> = {
  yellow: { light: '#8a6500', dark: '#17140c' },
  green: { light: '#1f7a4d', dark: '#121714' },
}

let activeTheme: ThemeId | null = null

function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function systemColorScheme(): ColorScheme {
  return prefersDark() ? 'dark' : 'light'
}

export function themeColorFor(
  theme: ThemeId,
  colorScheme: ColorScheme = systemColorScheme(),
): string {
  return THEME_COLORS[theme][colorScheme]
}

function updateThemeColor(theme: ThemeId): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = themeColorFor(theme)
}

/** Preferenza del dispositivo, usata anche dalle pagine pubbliche. */
export function readTheme(): ThemeId {
  try {
    return normalizeTheme(localStorage.getItem(DEVICE_THEME_KEY))
  } catch {
    return 'yellow'
  }
}

export function writeTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(DEVICE_THEME_KEY, theme)
  } catch {
    // Storage non disponibile: la scelta vale per la sessione corrente.
  }
}

/**
 * Applica la palette al documento. Chiaro e scuro restano gestiti dalla media
 * query del sistema in `app.css`; qui aggiorniamo solo l'attributo e il colore
 * della barra del browser.
 */
export function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return

  activeTheme = theme
  document.documentElement.dataset.theme = theme
  updateThemeColor(theme)
}

/** Ricalcola il theme-color quando il sistema passa da chiaro a scuro. */
export function refreshThemeColor(): void {
  if (typeof document === 'undefined' || !activeTheme) return
  updateThemeColor(activeTheme)
}

/** Notifica i cambi di `prefers-color-scheme`; no-op senza matchMedia. */
export function subscribeSystemColorScheme(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
