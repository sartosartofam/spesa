// Utility SEO condivise: normalizeSiteUrl e costruzione di sitemap/robots.
//
// VITE_SITE_URL è la fonte del dominio di produzione. Non essendo ancora
// deciso (documentazione umana in attesa), i valori restano assenti finché
// la variabile non viene impostata: nessun URL fittizio nel repository.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Normalizza VITE_SITE_URL in un URL base assoluto senza slash finale.
 * Restituisce '' se la variabile manca o è vuota; lancia un errore con un
 * messaggio chiaro se la variabile è presente ma non valida, così una
 * configurazione sbagliata rompe la build invece di produrre tag rotti.
 */
export function normalizeSiteUrl(input: string | undefined | null): string {
  const value = input?.trim() ?? ''
  if (!value) return ''

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      `VITE_SITE_URL non valido: "${value}". Usa un URL assoluto, per esempio https://esempio.it`,
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`VITE_SITE_URL deve usare http o https, non "${parsed.protocol}"`)
  }
  if (parsed.protocol === 'http:' && !LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`VITE_SITE_URL in http ammesso solo su localhost, non su "${parsed.hostname}"`)
  }

  return parsed.origin
}

/** Unisce siteUrl (eventualmente vuoto) e path in un URL assoluto. */
export function absolutePath(siteUrl: string, path: string): string {
  if (!siteUrl) return path
  if (path === '/') return `${siteUrl}/`
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${siteUrl}${suffix}`
}

/** Percorsi pubblici e indicizzabili dell'app, in ordine di importanza. */
export const INDEXABLE_PATHS: ReadonlyArray<string> = ['/', '/privacy']

/** Sitemap XML minimalista: solo le viste indicizzabili. */
export function buildSitemapXml(siteUrl: string, lastmod: string): string {
  const entries = INDEXABLE_PATHS.map((path) => {
    const loc = absolutePath(siteUrl, path)
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
}

/** robots.txt: crawl aperto, sitemap solo con dominio configurato. */
export function buildRobotsTxt(siteUrl: string): string {
  const lines = ['User-agent: *', 'Allow: /']
  if (siteUrl) lines.push(`Sitemap: ${absolutePath(siteUrl, '/sitemap.xml')}`)
  return `${lines.join('\n')}\n`
}
