// Budget del bundle: misura il peso gzip di ciò che il browser deve davvero
// scaricare per avviare l'app e fallisce la build se cresce troppo.
//
// Vite stampa già le dimensioni per file, ma nessuno le guarda: un limite
// esplicito rende la regressione un errore di CI invece di una scoperta
// tardiva sul telefono di qualcuno. Il calcolo vive qui (e non in
// `vite.config.ts`) per poterlo testare come logica pura.
//
// Non entrano nel budget:
// - i font: sono `.woff2` con `unicode-range`, il browser scarica solo i
//   sottoinsiemi che gli servono (di norma il latino);
// - le icone e le immagini: statiche, cambiano raramente e la PWA le precacha.

import { gzipSync } from 'node:zlib'

export interface BundleBudget {
  jsGzipKb: number
  cssGzipKb: number
}

export interface BundleAsset {
  fileName: string
  bytes: string | Uint8Array
}

export interface BundleReport {
  jsGzipKb: number
  cssGzipKb: number
  /** Vuoto quando il bundle sta dentro il budget. */
  violations: string[]
}

/**
 * Limiti in kB di gzip, al 13 novembre 2026 (JS 98.5, CSS 9.2 misurati con
 * `npm run build`). Circa il 15% di margine: un aumento più grande va
 * giustificato, non nascosto.
 */
export const BUNDLE_BUDGET: BundleBudget = {
  jsGzipKb: 115,
  cssGzipKb: 12,
}

function gzipKb(bytes: string | Uint8Array): number {
  return gzipSync(Buffer.from(bytes)).byteLength / 1024
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Somma il peso gzip dei file JS e CSS del bundle. Ogni file viene compresso
 * da solo, come fa il server: la somma è quindi la dimensione reale di
 * trasferimento, non una stima.
 */
export function measureBundle(
  assets: readonly BundleAsset[],
  budget: BundleBudget = BUNDLE_BUDGET,
): BundleReport {
  let js = 0
  let css = 0

  for (const asset of assets) {
    if (asset.fileName.endsWith('.js')) js += gzipKb(asset.bytes)
    else if (asset.fileName.endsWith('.css')) css += gzipKb(asset.bytes)
  }

  const jsGzipKb = round(js)
  const cssGzipKb = round(css)
  const violations: string[] = []

  if (jsGzipKb > budget.jsGzipKb) {
    violations.push(`JS ${jsGzipKb} kB gzip oltre il limite di ${budget.jsGzipKb} kB`)
  }
  if (cssGzipKb > budget.cssGzipKb) {
    violations.push(`CSS ${cssGzipKb} kB gzip oltre il limite di ${budget.cssGzipKb} kB`)
  }

  return { jsGzipKb, cssGzipKb, violations }
}
