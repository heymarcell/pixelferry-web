import { expect, test } from '@playwright/test'

test.describe('homepage', () => {
  test('renders the hero without waiting for JavaScript', async ({ page }) => {
    /*
     * The defect this whole rebuild exists to fix. On the React site the hero
     * was wrapped in a Motion variant with `initial={{opacity: 0}}`; in
     * production the entrance animation never ran, and the headline, pitch,
     * waitlist form and reassurance line were all permanently invisible
     * (verified in Chrome 151: h1 computed opacity "0", no animations).
     *
     * `toBeVisible()` alone is NOT enough to catch that: Playwright treats an
     * element with a non-empty bounding box as visible and does not look at
     * `opacity`. The computed-opacity assertion below is the one that would
     * have failed on the live site.
     */
    await page.goto('/')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Mixed formats.')
    await expect(h1).toContainText('One clean batch.')
    expect(await h1.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')

    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /join waitlist/i })).toBeVisible()
  })

  test('content stays readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Your images stay on your Mac')).toBeVisible()

    /*
     * Every reveal target must be RENDERED, not merely present in the DOM.
     * `toBeVisible()` does not check opacity, so it would pass on exactly the
     * failure that shipped to production — assert the computed value.
     */
    const faded = await page
      .locator('[data-reveal]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => getComputedStyle(node).opacity !== '1')
          .map((node) => `${node.tagName}.${String(node.className).slice(0, 50)}`),
      )
    expect(faded, 'content must never be hidden when JavaScript does not run').toEqual([])
    expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0)

    await context.close()
  })

  test('makes no third-party request on load', async ({ page }) => {
    // No trackers, no fonts from a CDN, no Turnstile before it is needed.
    const external: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url())
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    expect(external).toEqual([])
  })

  test('has exactly one h1 and a sane heading outline', async ({ page }) => {
    await page.goto('/')
    expect(await page.locator('h1').count()).toBe(1)

    const levels = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((nodes) => nodes.map((n) => Number(n.tagName[1])))
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!, `jump at heading ${i}`).toBeLessThanOrEqual(1)
    }
  })

  test('the app preview is one image to assistive tech', async ({ page }) => {
    // Its simulated buttons must never read as real controls.
    await page.goto('/')
    const preview = page.getByRole('img', { name: /the pixelferry window/i })
    await expect(preview).toBeVisible()
    expect(await preview.getByRole('button').count()).toBe(0)
    expect(await preview.getByRole('link').count()).toBe(0)
  })

  test('links to the content architecture', async ({ page }) => {
    await page.goto('/')
    for (const href of ['/formats', '/convert', '/guides', '/privacy', '/cookies']) {
      expect(await page.locator(`a[href="${href}"]`).count(), href).toBeGreaterThan(0)
    }
  })

  test('the skip link works from the keyboard', async ({ page, browserName }) => {
    /*
     * Safari ships with "Press Tab to highlight each item on a webpage" OFF,
     * so WebKit's Tab key moves between text fields only and skips links and
     * checkboxes. That is a browser preference, not a page defect — the
     * controls are focusable, which `every interactive control has a visible
     * focus indicator` proves in WebKit by calling focus() directly.
     */
    test.skip(browserName === 'webkit', 'WebKit Tab order follows the Safari preference')
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: /skip to content/i })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await skip.press('Enter')
    await expect(page.locator('#main')).toBeAttached()
  })

  test('never scrolls horizontally', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('content pages', () => {
  for (const url of [
    '/formats',
    '/convert',
    '/convert/heic-to-jpg',
    '/guides',
    '/guides/batch-convert-images-on-mac',
    '/privacy',
    '/cookies',
  ]) {
    test(`${url} renders and never scrolls horizontally`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }

  test('the conversion page states its limitations', async ({ page }) => {
    await page.goto('/convert/pdf-to-png')
    await expect(page.getByRole('heading', { name: /limitations/i })).toBeVisible()
    // The real product limit must be on the page, not hidden in a tooltip.
    await expect(page.getByText(/100 pages/).first()).toBeVisible()
  })

  test('states the correct minimum macOS version', async ({ page }) => {
    await page.goto('/formats')
    await expect(page.getByText(/macOS 14 \(Sonoma\) or later/).first()).toBeVisible()
    expect(await page.getByText(/macOS 13/).count()).toBe(0)
  })
})
