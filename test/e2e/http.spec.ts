import { expect, test } from '@playwright/test'

/**
 * HTTP-level behaviour, checked against `wrangler dev` — the same Workers
 * Static Assets implementation production uses. These are the assertions that
 * would have caught the previous deployment's defects.
 */
test.describe('HTTP contract', () => {
  /*
   * Cloudflare-specific behaviour, so it runs only against `wrangler dev`.
   * The Safari project is served by scripts/serve-dist.mjs, which mimics the
   * URL mapping well enough to reach pages but is not the thing under test.
   */
  test.skip(({ browserName }) => browserName === 'webkit', 'asserts real workerd behaviour')

  test('an unknown URL returns a real 404, not the homepage', async ({ request }) => {
    // The defect this migration fixes: the Pages deployment answered 200 with
    // the SPA shell for every unknown URL, so Search indexed junk URLs and
    // found the homepage at each of them.
    const response = await request.get('/definitely-not-a-real-page-9f3a', {
      maxRedirects: 0,
    })
    expect(response.status()).toBe(404)

    const body = await response.text()
    expect(body).toContain('That page isn’t here.')
    // A soft 404 would serve the homepage's headline here.
    expect(body).not.toContain('One clean batch.')
  })

  test('nested unknown URLs also 404', async ({ request }) => {
    for (const url of ['/convert/not-a-conversion', '/guides/nope', '/a/b/c']) {
      const response = await request.get(url, { maxRedirects: 0 })
      expect(response.status(), `${url} should 404`).toBe(404)
    }
  })

  test.describe('canonical URL shape', () => {
    for (const url of [
      '/',
      '/formats',
      '/convert',
      '/convert/heic-to-jpg',
      '/guides',
      '/privacy',
    ]) {
      test(`${url} is served directly`, async ({ request }) => {
        const response = await request.get(url, { maxRedirects: 0 })
        expect(response.status()).toBe(200)
      })
    }

    test('a trailing slash redirects to the canonical form', async ({ request }) => {
      const response = await request.get('/privacy/', { maxRedirects: 0 })
      expect([301, 307, 308]).toContain(response.status())
      expect(response.headers()['location']).toMatch(/\/privacy$/)
    })

    test('an .html extension redirects to the canonical form', async ({ request }) => {
      // These URLs were reachable on the old deployment; they must not become
      // a second indexable copy of every page.
      const response = await request.get('/privacy.html', { maxRedirects: 0 })
      expect([301, 307, 308]).toContain(response.status())
      expect(response.headers()['location']).toMatch(/\/privacy$/)
    })
  })

  test('security headers are present and carry no unsafe-inline', async ({ request }) => {
    const headers = (await request.get('/')).headers()

    const csp = headers['content-security-policy']
    expect(csp).toBeTruthy()
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    // Turnstile needs both, and the widget silently fails without either.
    expect(csp).toContain('script-src')
    expect(csp).toMatch(/script-src[^;]*challenges\.cloudflare\.com/)
    expect(csp).toMatch(/frame-src[^;]*challenges\.cloudflare\.com/)
    // The API the waitlist posts to.
    expect(csp).toMatch(/connect-src[^;]*api\.pixelferry\.app/)

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['strict-transport-security']).toContain('max-age=31536000')
    expect(headers['permissions-policy']).toContain('geolocation=()')
  })

  test('fingerprinted assets are immutable, HTML is not', async ({ request, page }) => {
    await page.goto('/')
    const asset = await page.getAttribute('link[rel="stylesheet"]', 'href')
    expect(asset).toMatch(/^\/_astro\//)

    const assetHeaders = (await request.get(asset!)).headers()
    expect(assetHeaders['cache-control']).toContain('immutable')

    const htmlHeaders = (await request.get('/')).headers()
    expect(htmlHeaders['cache-control'] ?? '').not.toContain('immutable')
  })

  test('robots.txt points at the generated sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toContain('https://pixelferry.app/sitemap-index.xml')
    expect(body).not.toMatch(/^Disallow: \/$/m)

    expect((await request.get('/sitemap-index.xml')).status()).toBe(200)
    expect((await request.get('/sitemap-0.xml')).status()).toBe(200)
  })

  test('the favicon set Google needs is reachable', async ({ request }) => {
    for (const url of [
      '/favicon.ico',
      '/favicon-96.png',
      '/favicon.svg',
      '/apple-touch-icon.png',
    ]) {
      const response = await request.get(url)
      expect(response.status(), `${url}`).toBe(200)
    }
  })
})
