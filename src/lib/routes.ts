export type AppRoute = 'landing' | 'login' | 'register' | 'app' | 'not-found'

/**
 * Risolve il pathname nelle viste dell'app.
 *
 * Le route sono volutamente minime (ADR-0005): niente router esterno, solo
 * History API. `/app` e i suoi sottopercorsi sono privati; `/` è la landing
 * pubblica indicizzabile, `/login` e `/register` sono le pagine di autenticazione.
 */
export function routeFromPath(pathname: string): AppRoute {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/' || path === '') return 'landing'
  if (path === '/login') return 'login'
  if (path === '/register') return 'register'
  if (path === '/app' || path.startsWith('/app/')) return 'app'
  return 'not-found'
}

/** True per le viste che richiedono una sessione autenticata. */
export function isPrivateRoute(route: AppRoute): boolean {
  return route === 'app'
}

/** Naviga lato client e notifica gli hook che ascoltano `popstate`. */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (current === path) return

  if (options.replace) {
    window.history.replaceState(null, '', path)
  } else {
    window.history.pushState(null, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}
