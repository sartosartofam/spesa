import type { ThemeId } from './settings'

const THEME_COLORS: Record<ThemeId, string> = {
  auto: '#1f7a4d',
  light: '#1f7a4d',
  'dark-yellow': '#17140c',
  'light-yellow': '#8a6500',
}

export function themeColorFor(theme: ThemeId): string {
  return THEME_COLORS[theme]
}

/**
 * Applica il tema al documento. `auto` lascia attiva la media query del
 * sistema, mentre gli altri valori attivano le palette esplicite in `app.css`.
 */
export function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = themeColorFor(theme)
}
