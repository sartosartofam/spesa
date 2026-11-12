import preact from '@preact/preset-vite'
import { loadEnv, type Plugin, defineConfig } from 'vite'
import { buildRobotsTxt, buildSitemapXml, normalizeSiteUrl } from './src/lib/seo'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dominio di produzione non ancora deciso: senza VITE_SITE_URL la build
  // resta valida ma senza canonical/og:url assoluti né sitemap (che senza
  // dominio avrebbe loc relativi, non validi per i motori di ricerca).
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL)

  const seoSiteUrls = (): Plugin => ({
    name: 'seo-site-urls',
    apply: 'build',
    transformIndexHtml(html) {
      if (!siteUrl) return html
      const withAbsoluteImage = html
        .split('content="/og-image.png"')
        .join(`content="${siteUrl}/og-image.png"`)
      const absolute = `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n`
      return withAbsoluteImage.replace(
        '    <meta property="og:title"',
        `${absolute}    <meta property="og:title"`,
      )
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: buildRobotsTxt(siteUrl),
      })
      if (siteUrl) {
        const lastmod = new Date().toISOString().slice(0, 10)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: buildSitemapXml(siteUrl, lastmod),
        })
      }
    },
  })

  return {
    plugins: [preact(), seoSiteUrls()],
    server: {
      port: 5173,
    },
    build: {
      target: 'es2022',
      // Non inlineare i font come data URI: la CSP usa `font-src 'self'` e
      // vuole che i font arrivino solo dall'origine dell'app.
      assetsInlineLimit: 0,
    },
  }
})
