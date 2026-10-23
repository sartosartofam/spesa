import { useEffect, useState } from 'preact/hooks'
import { type AppRoute, routeFromPath } from '../lib/routes'

export function useRoute(): { pathname: string; route: AppRoute } {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  return { pathname, route: routeFromPath(pathname) }
}
