import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, themeColorFor } from './theme'

describe('temi', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = '<meta name="theme-color" content="#1f7a4d" />'
  })

  it('espone un colore browser per ogni tema', () => {
    expect(themeColorFor('auto')).toBe('#1f7a4d')
    expect(themeColorFor('light')).toBe('#1f7a4d')
    expect(themeColorFor('dark-yellow')).toBe('#17140c')
    expect(themeColorFor('light-yellow')).toBe('#8a6500')
  })

  it('applica il tema al documento e aggiorna theme-color', () => {
    applyTheme('dark-yellow')

    expect(document.documentElement.dataset.theme).toBe('dark-yellow')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#17140c',
    )

    applyTheme('auto')

    expect(document.documentElement.dataset.theme).toBe('auto')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#1f7a4d',
    )
  })
})
