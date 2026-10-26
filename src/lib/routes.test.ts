import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPrivateRoute, navigate, routeFromPath } from './routes'

describe('routeFromPath', () => {
  it('riconosce la landing pubblica', () => {
    expect(routeFromPath('/')).toBe('landing')
    expect(routeFromPath('')).toBe('landing')
  })

  it('riconosce la pagina di login', () => {
    expect(routeFromPath('/login')).toBe('login')
    expect(routeFromPath('/login/')).toBe('login')
  })

  it('riconosce la pagina di registrazione', () => {
    expect(routeFromPath('/register')).toBe('register')
    expect(routeFromPath('/register/')).toBe('register')
  })

  it('riconosce le pagine di recupero password', () => {
    expect(routeFromPath('/forgot-password')).toBe('forgot-password')
    expect(routeFromPath('/forgot-password/')).toBe('forgot-password')
    expect(routeFromPath('/reset-password')).toBe('reset-password')
    expect(routeFromPath('/reset-password/')).toBe('reset-password')
  })

  it('riconosce la pagina privacy', () => {
    expect(routeFromPath('/privacy')).toBe('privacy')
    expect(routeFromPath('/privacy/')).toBe('privacy')
  })

  it('tratta /app e i sottopercorsi come area privata', () => {
    expect(routeFromPath('/app')).toBe('app')
    expect(routeFromPath('/app/')).toBe('app')
    expect(routeFromPath('/app/lista')).toBe('app')
    expect(routeFromPath('/app/impostazioni/negozi')).toBe('app')
  })

  it('marca i path sconosciuti come not-found', () => {
    expect(routeFromPath('/qualcosa')).toBe('not-found')
    expect(routeFromPath('/login-extra')).toBe('not-found')
  })
})

describe('isPrivateRoute', () => {
  it('considera privata solo l’area app', () => {
    expect(isPrivateRoute('app')).toBe(true)
    expect(isPrivateRoute('landing')).toBe(false)
    expect(isPrivateRoute('login')).toBe(false)
    expect(isPrivateRoute('register')).toBe(false)
    expect(isPrivateRoute('forgot-password')).toBe(false)
    expect(isPrivateRoute('reset-password')).toBe(false)
    expect(isPrivateRoute('privacy')).toBe(false)
    expect(isPrivateRoute('not-found')).toBe(false)
  })
})

describe('navigate', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('riporta in cima dopo un cambio di route', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.history.replaceState(null, '', '/')

    navigate('/privacy')

    expect(window.location.pathname).toBe('/privacy')
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
  })

  it('riporta in cima anche quando il path è già quello corrente', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.history.replaceState(null, '', '/privacy')

    navigate('/privacy')

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
  })
})
