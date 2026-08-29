import { expect, test } from '@playwright/test'

/**
 * The waitlist must fail CLOSED without JavaScript.
 *
 * Before this suite existed the form carried no `method` and no `action`, with
 * `name="email"` and `name="consent"` on its controls. With JavaScript
 * unavailable the browser's defaults took over — GET to the current URL — and
 * submitting navigated to:
 *
 *     /?email=someone@example.com&consent=on
 *
 * That put a visitor's address into the URL, their history, and any referrer
 * or access log downstream, and recorded an "on" consent nothing had verified.
 *
 * Every assertion here is about that failure not being reachable again.
 */

const SENTINEL = 'pii-leak-test@example.invalid'
/** The address as it would appear percent-encoded in a query string. */
const SENTINEL_ENCODED = encodeURIComponent(SENTINEL)

function leaks(value: string): boolean {
  return (
    value.includes(SENTINEL) ||
    value.includes(SENTINEL_ENCODED) ||
    value.includes('pii-leak-test') ||
    /[?&]email=/.test(value) ||
    /[?&]consent=/.test(value)
  )
}

test.describe('waitlist without JavaScript', () => {
  test('submitting never puts the address in a URL', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    // Record every navigation the page attempts, not just where it ends up —
    // a redirect chain could leak and then land somewhere clean.
    const navigations: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url())
    })

    // And every request, so a leak cannot escape as a subresource either.
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))

    await page.goto('/')
    const startUrl = page.url()

    await page.fill('input[type="email"]', SENTINEL)
    await page.check('input[type="checkbox"]')

    // Both submission routes: the button, and implicit submission via Enter.
    await page.click('button[type="submit"]')
    await page.waitForTimeout(500)
    await page.locator('input[type="email"]').press('Enter')
    await page.waitForTimeout(500)

    expect(page.url(), 'the address must never reach the URL').toBe(startUrl)
    expect(leaks(page.url())).toBe(false)

    for (const url of navigations) {
      expect(leaks(url), `navigation leaked the address: ${url}`).toBe(false)
    }
    for (const url of requests) {
      expect(leaks(url), `request leaked the address: ${url}`).toBe(false)
    }

    await context.close()
  })

  test('no submission request is made at all', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/')
    const baseline = page.url()

    const posts: string[] = []
    const documents: string[] = []
    page.on('request', (request) => {
      if (request.method() !== 'GET') posts.push(`${request.method()} ${request.url()}`)
      if (request.resourceType() === 'document') documents.push(request.url())
    })

    await page.fill('input[type="email"]', SENTINEL)
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(600)

    expect(posts, 'no non-GET submission may be attempted').toEqual([])
    expect(documents, 'no document navigation may be attempted').toEqual([])
    expect(page.url()).toBe(baseline)

    await context.close()
  })

  test('the form declares nothing a browser could submit', async ({ browser }) => {
    // The structural guarantees, asserted directly so a regression is named
    // rather than merely observed downstream.
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    const form = page.locator('form[data-waitlist]')
    // `method="dialog"` with no ancestor <dialog> aborts submission per spec.
    await expect(form).toHaveAttribute('method', 'dialog')
    // No `action`: there is no endpoint for a native submission to reach.
    expect(await form.getAttribute('action')).toBeNull()

    // Only NAMED controls enter the form data set. There are none.
    const named = await form.locator('[name]').count()
    expect(named, 'no control in the waitlist form may carry a name').toBe(0)

    await context.close()
  })

  test('offers a usable fallback that implies no consent', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    // <noscript> content is rendered when scripting is disabled.
    const fallback = page.getByRole('link', { name: /beta@pixelferry\.app/i })
    await expect(fallback).toBeVisible()

    const href = await fallback.getAttribute('href')
    expect(href).toMatch(/^mailto:beta@pixelferry\.app/)
    // The visitor writes their own message; nothing pre-fills their address,
    // and nothing about the mailto asserts they agreed to anything.
    expect(leaks(href ?? '')).toBe(false)
    expect(href).not.toContain('consent')

    // The consent box stays unticked and unclaimed.
    await expect(page.locator('input[type="checkbox"]')).not.toBeChecked()

    await context.close()
  })

  test('the page and the consent wording stay readable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByText('I agree to PixelFerry product and early-access emails. Unsubscribe anytime.'),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible()

    await context.close()
  })

  test('the enhanced path still works when JavaScript runs', async ({ page }) => {
    // The fix must not have cost the thing it protects.
    await page.route('**/challenges.cloudflare.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.turnstile={render:(el,o)=>{window.__cb=o.callback;return 'w'},
               execute:()=>setTimeout(()=>window.__cb('tok'),0),reset:()=>{},remove:()=>{}};`,
      }),
    )
    let body: Record<string, unknown> | null = null
    await page.route('**/api.pixelferry.app/**', (route) => {
      body = route.request().postDataJSON()
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: '{"pending":true}',
      })
    })

    await page.goto('/')
    await page.fill('input[type="email"]', SENTINEL)
    await page.check('input[type="checkbox"]')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/check your inbox/i)).toBeVisible()
    expect(body).toMatchObject({ email: SENTINEL, source: 'landing' })
    // Even on the happy path the address never reaches the URL.
    expect(leaks(page.url())).toBe(false)
  })
})
