import { describe, expect, it } from 'vitest'
import { isPrivateRoute, routeFromPath } from './routes'

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
    expect(isPrivateRoute('privacy')).toBe(false)
    expect(isPrivateRoute('not-found')).toBe(false)
  })
})
