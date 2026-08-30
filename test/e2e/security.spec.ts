import { expect, test, type Page } from '@playwright/test'

/**
 * Security and privacy behaviour, observed in a real browser.
 *
 * The header CSP claims to need no 'unsafe-inline'. A static check of the
 * built HTML proves nothing about whether the browser then refuses to run the
 * page, so this listens for actual CSP violation reports while the page loads
 * and while the form is used.
 */

/** Collect every CSP violation the page reports. */
async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = []
  await page.addInitScript(() => {
    ;(window as never as { __csp: string[] }).__csp = []
    document.addEventListener('securitypolicyviolation', (event) => {
      ;(window as never as { __csp: string[] }).__csp.push(
        `${event.violatedDirective} blocked ${event.blockedURI} (${event.sourceFile ?? 'inline'})`,
      )
    })
  })
  page.on('console', (message) => {
    const text = message.text()
    if (/content security policy/i.test(text)) violations.push(text)
  })
  return violations
}

async function reportedViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as never as { __csp: string[] }).__csp ?? [])
}

const PAGES = ['/', '/formats', '/convert/heic-to-jpg', '/guides', '/privacy', '/cookies']

test.describe('content security policy', () => {
  for (const url of PAGES) {
    test(`${url} loads with no CSP violation`, async ({ page }) => {
      const consoleViolations = await watchCsp(page)
      await page.goto(url, { waitUntil: 'networkidle' })

      expect(await reportedViolations(page), `CSP violations on ${url}`).toEqual([])
      expect(consoleViolations, `CSP console errors on ${url}`).toEqual([])
    })
  }

  test('the enhancement scripts actually run under the CSP', async ({ page }) => {
    // A CSP that blocks our own scripts would look identical to "no
    // violations" if the scripts were simply never referenced. This proves
    // the external modules executed.
    await page.goto('/')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('js-reveal')))
      .toBe(true)
  })

  test('the waitlist form works end to end under the CSP', async ({ page }) => {
    const consoleViolations = await watchCsp(page)

    await page.route('**/challenges.cloudflare.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.turnstile = {
          render: (el, o) => { window.__cb = o.callback; return 'w' },
          execute: () => setTimeout(() => window.__cb('tok'), 0),
          reset: () => {}, remove: () => {},
        };`,
      }),
    )
    let posted = false
    await page.route('**/api.pixelferry.app/**', (route) => {
      posted = true
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: '{"pending":true}',
      })
    })

    await page.goto('/')
    await page.getByRole('textbox', { name: /email/i }).fill('nobody@example.invalid')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /join waitlist/i }).click()
    await expect(page.getByText(/check your inbox/i)).toBeVisible()

    expect(posted, 'connect-src must permit the API').toBe(true)
    expect(await reportedViolations(page)).toEqual([])
    expect(consoleViolations).toEqual([])
  })
})

test.describe('privacy', () => {
  test('sets no cookie and no storage without consent', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(await context.cookies()).toEqual([])
    expect(
      await page.evaluate(() => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      })),
    ).toEqual({ local: [], session: [] })
  })

  test('shows no cookie banner when no tag is configured', async ({ page }) => {
    // A banner for storage that does not exist would be misleading.
    await page.goto('/')
    expect(await page.locator('[data-cookie-banner]').count()).toBe(0)
    expect(await page.getByText(/we use cookies/i).count()).toBe(0)
  })

  test('requests no tracker on any page', async ({ page }) => {
    const TRACKERS = [
      'googletagmanager.com',
      'google-analytics.com',
      'connect.facebook.net',
      'facebook.com',
      'doubleclick.net',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ]
    const seen: string[] = []
    page.on('request', (request) => {
      if (TRACKERS.some((host) => request.url().includes(host))) seen.push(request.url())
    })

    for (const url of PAGES) {
      await page.goto(url, { waitUntil: 'networkidle' })
    }
    expect(seen).toEqual([])
  })

  test('serves fonts from this origin only', async ({ page }) => {
    const fonts: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fonts.push(request.url())
    })
    await page.goto('/', { waitUntil: 'networkidle' })

    expect(fonts.length).toBeGreaterThan(0)
    for (const url of fonts) {
      expect(new URL(url).hostname, 'fonts must be self-hosted').toMatch(
        /^(127\.0\.0\.1|localhost)$/,
      )
      expect(url).toContain('/_astro/')
    }
  })

  test('the page cannot be framed', async ({ request }) => {
    const headers = (await request.get('/')).headers()
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['x-frame-options']).toBe('DENY')
  })
})
