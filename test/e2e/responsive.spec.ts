import { expect, test } from '@playwright/test'

/**
 * Horizontal overflow at real device widths.
 *
 * Runs in the desktop project only — the viewport is set explicitly here, so
 * running it three times over would test the same thing three times.
 *
 * 320px is the narrowest width still worth supporting (iPhone SE 1st gen and
 * a Fold's cover screen); 430 is the iPhone Pro Max class. The nav shipped an
 * overflow at every one of these before this test existed.
 */
const WIDTHS = [320, 375, 390, 412, 430, 768]
const PAGES = [
  '/',
  '/formats',
  '/convert',
  '/convert/heic-to-jpg',
  '/guides',
  '/guides/batch-convert-images-on-mac',
  '/privacy',
  '/cookies',
]

test.describe('responsive layout', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'viewport-driven; one engine is enough',
  )

  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })

      for (const url of PAGES) {
        await page.goto(url)
        const report = await page.evaluate(() => {
          const clientWidth = document.documentElement.clientWidth
          const offenders: string[] = []
          for (const el of document.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0) continue
            // Only elements that are not inside a scroll container of their own.
            let inScroller = false
            for (let node = el.parentElement; node; node = node.parentElement) {
              const overflowX = getComputedStyle(node).overflowX
              if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') {
                inScroller = true
                break
              }
            }
            if (inScroller) continue
            if (rect.right > clientWidth + 1 || rect.left < -1) {
              offenders.push(
                `${el.tagName}.${String(el.className).slice(0, 60)} ` +
                  `[${Math.round(rect.left)}…${Math.round(rect.right)}]`,
              )
            }
          }
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth,
            offenders: offenders.slice(0, 5),
          }
        })

        expect(
          report.scrollWidth,
          `${url} at ${width}px overflows by ${report.scrollWidth - report.clientWidth}px: ` +
            report.offenders.join(' | '),
        ).toBeLessThanOrEqual(report.clientWidth + 1)
      }
    })
  }

  test('the consent checkbox stays a usable target on a phone', async ({ page }) => {
    // WCAG 2.2 target size (minimum) is 24x24 CSS px.
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/')
    const box = await page.getByRole('checkbox').boundingBox()
    expect(box).toBeTruthy()
    // The control is 18px, so the label it is bound to has to carry the rest of
    // the target — clicking the text toggles it.
    const label = await page.locator('label[for="waitlist-consent"]').boundingBox()
    expect(label!.height).toBeGreaterThanOrEqual(24)
    await page.locator('label[for="waitlist-consent"]').click()
    await expect(page.getByRole('checkbox')).toBeChecked()
  })

  test('the app preview stays inside the viewport on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    const preview = page.getByRole('img', { name: /the pixelferry window/i })
    const box = await preview.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
  })

  test('SEO content is not hidden on mobile', async ({ page }) => {
    // Hiding text on small screens hides it from the mobile-first index too.
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    // The Pencil design's section headings — the indexable content surface.
    for (const heading of [
      'Five file types shouldn’t require five different tools.',
      'Choose once. Apply to everything.',
      'Every file accounted for. Every result predictable.',
      'Your images never leave your Mac.',
      'Will PixelFerry open my file?',
      'Before you join.',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })
})
