import { defineConfig, devices } from '@playwright/test'

/**
 * E2E runs against `wrangler dev`, not `astro preview`.
 *
 * That matters: wrangler serves `dist/` through the same Workers Static Assets
 * implementation production uses, so the suite exercises the real
 * `not_found_handling`, the real `html_handling` URL mapping, and the real
 * `_headers` output — including the CSP. `astro preview` would test a
 * different server than the one we deploy to.
 */
const PORT = 8788
const BASE_URL = `http://127.0.0.1:${PORT}`

/*
 * Playwright's WebKit build times out on every request to `wrangler dev` on
 * this platform, while reaching a plain Node server on loopback fine. So the
 * Safari project runs against `scripts/serve-dist.mjs`, which serves the same
 * `dist/` and applies the same `_headers` CSP. Cloudflare-specific behaviour
 * (real 404 status, redirects, cache headers) is asserted in the Chromium
 * projects against real workerd — see test/e2e/http.spec.ts.
 */
const SAFARI_PORT = 8789
const SAFARI_URL = `http://127.0.0.1:${SAFARI_PORT}`

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /*
   * Chromium for the bulk of the suite, plus WebKit — PixelFerry is a macOS
   * product, so a large share of its visitors arrive in Safari, and Safari is
   * where `:has()`, `text-wrap: balance` and the font-metric overrides are
   * most likely to differ. The mobile project is Chromium (Pixel 7) so CI
   * downloads two browsers rather than three.
   */
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'], baseURL: SAFARI_URL } },
  ],

  webServer: [
    {
      // `--assets` is not passed: wrangler.jsonc already declares the
      // directory, not_found_handling and html_handling, so dev and production
      // agree.
      command: `npx wrangler dev --port ${PORT} --local`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `node scripts/serve-dist.mjs`,
      env: { PORT: String(SAFARI_PORT) },
      url: SAFARI_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
