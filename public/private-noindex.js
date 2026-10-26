// Imposta noindex già nell'HTML iniziale delle viste private, prima del bundle.
// La landing e /privacy restano indicizzabili; robots.txt non blocca il crawl.
;(() => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/app' ||
    path.startsWith('/app/')
  ) {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
  }
})()
