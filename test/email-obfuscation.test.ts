import { beforeAll, describe, expect, it } from 'vitest'
import { loadPages } from '../scripts/lib/pages.mjs'

type Page = { rel: string; html: string }

/**
 * CLOUDFLARE SCRAPE SHIELD REWRITES EMAIL ADDRESSES AT THE EDGE.
 *
 * With "Email Address Obfuscation" on — it is on, and it is on by default —
 * Cloudflare rewrites every `mailto:` href it finds into
 * `/cdn-cgi/l/email-protection#<hex>` and injects a script that decodes it in
 * the browser. Visible text becomes `[email protected]`.
 *
 * That is a production-only transformation. `dist/` is correct on disk and
 * wrong when served, so nothing that inspects the build output can observe the
 * damage directly. What CAN be checked at build time is the precondition:
 * every rendered `mailto:` must sit inside one of Cloudflare's documented
 * `<!--email_off-->` … `<!--/email_off-->` regions, because that is the only
 * thing that suppresses the rewrite.
 *
 * This matters twice over on this site:
 *
 *   - the legal pages must name a reachable controller contact, and an address
 *     that needs JavaScript to resolve is not reachable for a visitor with
 *     JavaScript off;
 *   - the waitlist's `<noscript>` fallback exists *only* for visitors without
 *     JavaScript, so a JS decoder there is self-defeating.
 *
 * This guard was written after the fact. The first fix wrapped the legal body
 * and the content-layout footer by hand and shipped no test, so the footer's
 * Contact link — present on all 21 pages — stayed obfuscated in production and
 * nothing failed. Hand-patching call sites is what missed it; enumerating them
 * is what catches it.
 */

const OPEN = '<!--email_off-->'
const CLOSE = '<!--/email_off-->'

/** Every `[start, end)` span protected by an opt-out region. */
function protectedRegions(html: string): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  let from = 0
  for (;;) {
    const open = html.indexOf(OPEN, from)
    if (open === -1) break
    const close = html.indexOf(CLOSE, open + OPEN.length)
    // An unterminated region protects nothing predictable — treat it as absent
    // so the assertions below fail loudly rather than passing on a broken pair.
    if (close === -1) break
    spans.push([open, close + CLOSE.length])
    from = close + CLOSE.length
  }
  return spans
}

function isProtected(index: number, spans: Array<[number, number]>): boolean {
  return spans.some(([start, end]) => index >= start && index < end)
}

describe('Cloudflare email obfuscation opt-out', () => {
  let pages: Page[]

  beforeAll(async () => {
    pages = (await loadPages()) as Page[]
    expect(pages.length).toBeGreaterThan(15)
  })

  it('wraps every rendered mailto: link in an opt-out region', () => {
    const escaped: string[] = []

    for (const page of pages) {
      const spans = protectedRegions(page.html)
      for (const match of page.html.matchAll(/href="mailto:([^"]*)"/g)) {
        if (!isProtected(match.index, spans)) {
          escaped.push(`${page.rel} → mailto:${match[1]}`)
        }
      }
    }

    expect(escaped, 'these mailto links will be obfuscated in production').toEqual([])
  })

  it('wraps every bare address rendered as visible text', () => {
    // The rewrite also targets addresses in text nodes, not just hrefs.
    const ADDRESS = /[A-Za-z0-9._%+-]+@pixelferry\.app/g
    const escaped: string[] = []

    for (const page of pages) {
      const spans = protectedRegions(page.html)
      for (const match of page.html.matchAll(ADDRESS)) {
        if (!isProtected(match.index, spans)) {
          escaped.push(`${page.rel} → ${match[0]}`)
        }
      }
    }

    expect(escaped, 'these visible addresses will render as [email protected]').toEqual([])
  })

  it('pairs every opening marker with a closing one', () => {
    for (const page of pages) {
      const opens = page.html.split(OPEN).length - 1
      const closes = page.html.split(CLOSE).length - 1
      expect(opens, `${page.rel} has unbalanced email_off markers`).toBe(closes)
    }
  })

  /*
   * The footer is on every page, and its Contact link is the one that was
   * missed. Asserting the general rule above would pass on a build that simply
   * stopped rendering a contact link at all, so name the surface explicitly.
   */
  it('still publishes a contact link on every page that has a footer', () => {
    const withFooter = pages.filter((p) => p.html.includes('<footer'))
    expect(withFooter.length).toBeGreaterThan(15)
    for (const page of withFooter) {
      expect(page.html, `${page.rel} renders no contact address`).toMatch(
        /href="mailto:[^"]*@pixelferry\.app/,
      )
    }
  })
})
