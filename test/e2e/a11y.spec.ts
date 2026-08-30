import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Wait for the reveal transitions to finish before measuring anything.
 *
 * axe samples computed colours, and mid-transition a `data-reveal` element is
 * at a fractional opacity — so white-on-dark reads as grey-on-grey and every
 * revealed element reports a contrast failure that does not exist once the
 * page has settled. Poll for the settled state rather than sleeping.
 */
async function settle(page: Page) {
  await page.waitForFunction(() => {
    const targets = document.querySelectorAll('[data-reveal]')
    if (targets.length === 0) return true
    return [...targets].every((el) => getComputedStyle(el).opacity === '1')
  })
  // One more frame so any in-flight paint has committed.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))))
}

/**
 * axe scrolls elements into view as it walks the page, which re-triggers the
 * IntersectionObserver reveals and leaves it sampling an interpolated opacity —
 * white-on-dark then reads as grey-on-grey and every revealed element reports a
 * contrast failure that does not exist at rest.
 *
 * Reduced motion is not a workaround here: it is a real user setting in which
 * the reveals never arm at all, and the resulting palette is byte-identical to
 * the settled default state. `homepage.spec.ts` separately proves the default
 * state does become visible.
 */
async function stillPage(page: Page, url: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(url)
  await settle(page)
}

const PAGES = [
  '/',
  '/formats',
  '/convert',
  '/convert/heic-to-jpg',
  '/guides',
  '/guides/choosing-an-image-format',
  '/privacy',
  '/cookies',
  '/404-not-a-page',
]

/**
 * WCAG 2.2 AA, via axe. Zero violations of any impact — not "no serious ones".
 *
 * The live site failed `color-contrast` on the footer copyright (white at 40%
 * over #090B12 is 3.7:1), which is the class of defect this catches.
 */
test.describe('accessibility', () => {
  for (const url of PAGES) {
    test(`${url} has no axe violations`, async ({ page }) => {
      await stillPage(page, url)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()

      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          html: n.html.slice(0, 110),
          why: [...n.any, ...n.all].map((c) => c.message).join(' | '),
        })),
      }))
      expect(summary, `axe violations on ${url}`).toEqual([])
    })
  }

  test('every control tabbed to shows a visible focus indicator', async ({ page, browserName }) => {
    /*
     * Driven by the real Tab key, not by `element.focus()`.
     *
     * `:focus-visible` is a heuristic on the last input modality, so
     * programmatic focus matches it only sometimes — a test built on
     * `focus()` fails at random on whichever control it happens to reach.
     * Tabbing is both deterministic and the thing a keyboard user actually
     * does.
     *
     * Chromium only: Safari ships "Press Tab to highlight each item on a
     * webpage" off, so WebKit's Tab moves between text fields alone.
     */
    test.skip(browserName !== 'chromium', 'Tab order follows the Safari preference in WebKit')

    await stillPage(page, '/')
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

    const seen: string[] = []

    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab')

      const state = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null
        if (!active || active === document.body) return null

        // The indicator may be drawn on a wrapper — the waitlist field does
        // exactly that, so its ring follows the pill rather than cutting
        // through it. Check the control and its two nearest ancestors.
        const chain = [active, active.parentElement, active.parentElement?.parentElement].filter(
          (node): node is HTMLElement => node instanceof HTMLElement,
        )
        const indicated = chain.some((node) => {
          const style = getComputedStyle(node)
          const outlined = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
          return outlined || style.boxShadow.includes('rgb')
        })
        return { indicated, html: active.outerHTML.slice(0, 110) }
      })

      if (!state) break
      if (seen.includes(state.html)) break // wrapped around
      seen.push(state.html)

      expect(state.indicated, `no focus indicator on ${state.html}`).toBe(true)
    }

    // Guards against the whole loop passing because nothing was ever focused.
    expect(seen.length, 'Tab reached no focusable control').toBeGreaterThan(5)
  })

  test('reduced motion disables the reveal transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()

    // Content is visible immediately, with no transition to wait through.
    const styles = await page
      .locator('[data-reveal]')
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el)
        return { opacity: s.opacity, transitionDuration: s.transitionDuration }
      })
    expect(styles.opacity).toBe('1')
    expect(parseFloat(styles.transitionDuration)).toBeLessThan(0.05)
  })

  test('the language is declared', async ({ page }) => {
    await page.goto('/')
    expect(await page.getAttribute('html', 'lang')).toBe('en')
  })

  test('landmarks are present and unique', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toHaveCount(1)
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('footer')).toHaveCount(1)
    // Multiple navs are fine only when each is labelled.
    for (const nav of await page.locator('nav').all()) {
      const label =
        (await nav.getAttribute('aria-label')) ?? (await nav.getAttribute('aria-labelledby'))
      expect(label, 'every <nav> needs an accessible name').toBeTruthy()
    }
  })
})
