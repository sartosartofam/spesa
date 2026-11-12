import { defineConfig, devices } from '@playwright/test'

const PORT = 4174
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * E2e con backend reale (Supabase locale).
 *
 * A differenza di `playwright.config.ts` (dati mock, nessuna rete), questa
 * suite avvia lo stack locale, crea gli utenti demo, compila l'app in modalità
 * Supabase e la serve su una porta dedicata. Non tocca mai il cloud.
 *
 * Uso: `npm run test:e2e:backend`.
 */
export default defineConfig({
  testDir: './e2e-backend',
  globalTeardown: './e2e-backend/global-teardown.ts',
  // La famiglia demo è condivisa: i file non devono girare in parallelo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    // Stack locale + seed + build Supabase + preview sulla porta dedicata.
    command: 'bash scripts/e2e-backend.sh',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium-backend', use: { ...devices['Desktop Chrome'] } }],
})
