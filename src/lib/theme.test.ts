import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, readTheme, themeColorFor, writeTheme } from './theme'

describe('temi', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = '<meta name="theme-color" content="#8a6500" />'
  })

  it('espone un colore browser per palette e schema', () => {
    expect(themeColorFor('yellow', 'light')).toBe('#8a6500')
    expect(themeColorFor('yellow', 'dark')).toBe('#17140c')
    expect(themeColorFor('green', 'light')).toBe('#1f7a4d')
    expect(themeColorFor('green', 'dark')).toBe('#121714')
  })

  it('legge e salva la preferenza del dispositivo', () => {
    expect(readTheme()).toBe('yellow')

    writeTheme('green')
    expect(localStorage.getItem('spesa.theme.v1')).toBe('green')
    expect(readTheme()).toBe('green')
  })

  it('migra i vecchi valori salvati sul dispositivo', () => {
    localStorage.setItem('spesa.theme.v1', 'light-yellow')
    expect(readTheme()).toBe('yellow')

    localStorage.setItem('spesa.theme.v1', 'light')
    expect(readTheme()).toBe('green')

    localStorage.setItem('spesa.theme.v1', 'viola')
    expect(readTheme()).toBe('yellow')
  })

  it('applica la palette al documento e aggiorna theme-color', () => {
    applyTheme('green')

    expect(document.documentElement.dataset.theme).toBe('green')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#1f7a4d',
    )

    applyTheme('yellow')

    expect(document.documentElement.dataset.theme).toBe('yellow')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#8a6500',
    )
  })
})
