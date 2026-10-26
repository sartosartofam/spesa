import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    // Non inlineare i font come data URI: la CSP usa `font-src 'self'` e
    // vuole che i font arrivino solo dall'origine dell'app.
    assetsInlineLimit: 0,
  },
})
