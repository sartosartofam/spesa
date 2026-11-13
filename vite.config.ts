import preact from '@preact/preset-vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { measureBundle } from './src/lib/bundle-budget'
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

  // Il budget vive in `src/lib/bundle-budget.ts` (con i suoi test): qui
  // passiamo solo il bundle reale. Così una regressione di peso rompe
  // `npm run build` in locale e in CI invece di passare inosservata.
  const bundleBudget = (): Plugin => ({
    name: 'bundle-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      const report = measureBundle(
        Object.entries(bundle).map(([fileName, output]) => ({
          fileName,
          bytes: output.type === 'chunk' ? output.code : output.source,
        })),
      )
      if (report.violations.length === 0) return
      this.error(
        `Budget del bundle superato (JS ${report.jsGzipKb} kB gzip, CSS ${report.cssGzipKb} kB gzip): ` +
          `${report.violations.join('; ')}. Se la crescita è voluta, alza i limiti in ` +
          'src/lib/bundle-budget.ts spiegandone il motivo nella PR.',
      )
    },
  })

  return {
    plugins: [preact(), seoSiteUrls(), bundleBudget()],
    server: {
      port: 5173,
    },
    build: {
      target: 'es2022',
      // Non inlineare i font come data URI: la CSP usa `font-src 'self'` e
      // vuole che i font arrivino solo dall'origine dell'app.
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Supabase-js è ~2/3 del bundle e cambia solo quando aggiorniamo la
          // dipendenza: in un chunk separato resta in cache del browser (hash
          // immutabile) mentre il codice dell'app cambia a ogni deploy.
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
