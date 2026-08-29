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

  test('every interactive control has a visible focus indicator', async ({ page }) => {
    await stillPage(page, '/')
    const focusable = page.locator('a[href], button, input, [tabindex]:not([tabindex="-1"])')
    const count = Math.min(await focusable.count(), 25)

    for (let i = 0; i < count; i += 1) {
      const element = focusable.nth(i)
      if (!(await element.isVisible())) continue
      await element.focus()
      /*
       * The indicator does not have to be on the control itself: drawing it on
       * a wrapper is a normal pattern, and the waitlist input does exactly that
       * so the ring follows the pill rather than cutting through it. So check
       * the element and its two nearest ancestors.
       *
       * Read every shadow in the chain BEFORE blurring anything — blurring the
       * control also stops an ancestor's `:has(:focus-visible)` rule matching,
       * so interleaving the two reads makes every wrapper look unstyled.
       */
      const focused = await element.evaluate((el) => {
        const chain = [el, el.parentElement, el.parentElement?.parentElement].filter(
          (node): node is HTMLElement => node instanceof HTMLElement,
        )
        return chain.map((node) => {
          const style = getComputedStyle(node)
          return {
            hasOutline: style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
            boxShadow: style.boxShadow,
          }
        })
      })

      const resting = await element.evaluate((el) => {
        el.blur()
        const chain = [el, el.parentElement, el.parentElement?.parentElement].filter(
          (node): node is HTMLElement => node instanceof HTMLElement,
        )
        return chain.map((node) => getComputedStyle(node).boxShadow)
      })

      const indicated = focused.some(
        (state, index) =>
          state.hasOutline || (state.boxShadow !== 'none' && state.boxShadow !== resting[index]),
      )
      const html = await element.evaluate((el) => el.outerHTML.slice(0, 120))
      expect(indicated, `no focus indicator on ${html}`).toBe(true)
    }
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
