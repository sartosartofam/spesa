// Manifest di precache della PWA.
//
// Il service worker (`public/sw.js`) leggeva gli asset da `index.html`: bastava
// finché tutto il JS era nell'entry. Con l'app caricata su richiesta, il chunk
// dinamico non compare nell'HTML e resterebbe fuori dalla cache: chi apre
// `/app` offline dopo un deploy nuovo vedrebbe solo la schermata di
// caricamento. Il manifest emesso a build elenca tutti i file `/assets/` da
// mettere in cache all'installazione.
//
// Restano fuori font e immagini: i primi sono `.woff2` con `unicode-range`
// (il browser scarica solo i sottoinsiemi che servono) e vengono messi in
// cache alla prima richiesta, le seconde sono già nella shell.

/** File emesso in `dist/` e letto dal service worker all'installazione. */
export const PRECACHE_MANIFEST_FILE = 'precache.json'

const ASSET_PREFIX = 'assets/'
const BUNDLE_EXTENSION = /\.(?:js|css)$/

/**
 * Trasforma i nomi dei file prodotti da Vite (per esempio
 * `assets/app-abc123.js`) nelle URL assolute da precache (`/assets/app-abc123.js`).
 * Scarta font, immagini, `robots.txt` e `sitemap.xml`, che non servono per
 * avviare l'interfaccia offline.
 */
export function collectPrecacheAssets(fileNames: Iterable<string>): string[] {
  const assets = new Set<string>()

  for (const fileName of fileNames) {
    if (!fileName.startsWith(ASSET_PREFIX)) continue
    if (!BUNDLE_EXTENSION.test(fileName)) continue
    assets.add(`/${fileName}`)
  }

  // Ordine stabile: il manifest cambia solo quando cambiano davvero gli asset.
  return [...assets].sort()
}
