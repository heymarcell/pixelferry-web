#!/usr/bin/env node
/**
 * Build-time SEO audit over `dist/`.
 *
 * This runs against the ACTUAL emitted HTML, not against the source that was
 * supposed to produce it, so it catches a template that silently stopped
 * rendering a tag. Every assertion here corresponds to something that was
 * either wrong on the previous site or is easy to break by accident.
 *
 *   npm run audit:seo   (after npm run build)
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { DIST, ORIGIN, Report, loadPages, indexable, meta, prop } from './lib/pages.mjs'

const report = new Report('SEO audit')
const pages = await loadPages()
report.check(pages.length > 0, 'no HTML pages found in dist/ — did the build run?')

const live = indexable(pages)
const titles = new Map()
const descriptions = new Map()

for (const page of live) {
  const { dom, urlPath, rel } = page
  const at = (msg) => `${rel}: ${msg}`

  // ── Language ────────────────────────────────────────────────────────────
  report.check(dom.querySelector('html')?.getAttribute('lang'), at('missing <html lang>'))

  // ── Title ───────────────────────────────────────────────────────────────
  const title = dom.querySelector('title')?.text?.trim()
  report.check(title, at('missing <title>'))
  if (title) {
    report.check(
      !/^(untitled|todo|lorem|test|page)\b/i.test(title),
      at(`placeholder-looking title: "${title}"`),
    )
    const seen = titles.get(title)
    report.check(!seen, at(`duplicate <title> — also used by ${seen}`))
    titles.set(title, rel)
    // Editorial guidance only. Google rewrites titles; an exact pixel budget
    // is folklore, so length is a warning and never a failure.
    report.warn(title.length <= 70, at(`title is ${title.length} chars, may be truncated`))
  }

  // ── Description ─────────────────────────────────────────────────────────
  const description = meta(dom, 'description')
  report.check(description, at('missing meta description'))
  if (description) {
    const seen = descriptions.get(description)
    report.check(!seen, at(`duplicate meta description — also used by ${seen}`))
    descriptions.set(description, rel)
    report.check(
      description.length >= 50,
      at(`meta description is only ${description.length} chars`),
    )
    report.warn(description.length <= 175, at(`meta description is ${description.length} chars`))
  }

  // ── Canonical ───────────────────────────────────────────────────────────
  const canonicals = dom.querySelectorAll('link[rel="canonical"]')
  report.check(
    canonicals.length === 1,
    at(`expected exactly 1 canonical, found ${canonicals.length}`),
  )
  const canonical = canonicals[0]?.getAttribute('href')
  if (canonical) {
    report.check(
      canonical.startsWith(ORIGIN),
      at(`canonical is not absolute on ${ORIGIN}: ${canonical}`),
    )
    // Self-referencing: the canonical must name THIS page's URL.
    const expected = urlPath === '/' ? `${ORIGIN}/` : `${ORIGIN}${urlPath}`
    report.check(canonical === expected, at(`canonical ${canonical} !== expected ${expected}`))
    // Trailing-slash policy is 'never' (production redirects `/x/` to `/x`).
    report.check(
      canonical === `${ORIGIN}/` || !canonical.endsWith('/'),
      at(`canonical has a trailing slash: ${canonical}`),
    )
  }

  // ── Headings ────────────────────────────────────────────────────────────
  const h1s = dom.querySelectorAll('h1')
  report.check(h1s.length === 1, at(`expected exactly 1 <h1>, found ${h1s.length}`))
  report.check((h1s[0]?.text ?? '').trim().length > 0, at('<h1> is empty'))

  // No skipped levels: an h3 before any h2 is a broken outline.
  const levels = dom
    .querySelectorAll('h1, h2, h3, h4, h5, h6')
    .map((node) => Number(node.rawTagName.slice(1)))
  for (let i = 1; i < levels.length; i += 1) {
    report.check(
      levels[i] - levels[i - 1] <= 1,
      at(`heading level jumps from h${levels[i - 1]} to h${levels[i]}`),
    )
  }

  // ── Robots ──────────────────────────────────────────────────────────────
  // The production build must never ship a noindex. `PF_NOINDEX=1` is checked
  // separately in test/seo-output.test.ts.
  const robots = meta(dom, 'robots')
  report.check(robots && !robots.includes('noindex'), at(`indexable page has robots="${robots}"`))
  report.check(!meta(dom, 'keywords'), at('meta keywords is obsolete and should not be emitted'))

  // ── Open Graph / Twitter ────────────────────────────────────────────────
  for (const property of [
    'og:type',
    'og:site_name',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:type',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
  ]) {
    report.check(prop(dom, property), at(`missing ${property}`))
  }
  report.check(prop(dom, 'og:url') === canonical, at('og:url does not match the canonical'))
  report.check(
    (prop(dom, 'og:image') ?? '').startsWith(ORIGIN),
    at('og:image must be an absolute URL'),
  )
  report.check(meta(dom, 'twitter:card') === 'summary_large_image', at('missing twitter:card'))

  // ── Icons ───────────────────────────────────────────────────────────────
  // Google Search does not accept an SVG-only favicon and wants >= 48x48.
  const icons = dom.querySelectorAll('link[rel="icon"]').map((n) => n.getAttribute('href') ?? '')
  report.check(
    icons.some((href) => href.endsWith('.ico')),
    at('no .ico favicon declared'),
  )
  report.check(
    icons.some((href) => href.endsWith('.png')),
    at('no raster PNG favicon declared'),
  )
  report.check(
    dom.querySelector('link[rel="apple-touch-icon"]'),
    at('no apple-touch-icon declared'),
  )

  // ── JSON-LD ─────────────────────────────────────────────────────────────
  for (const node of dom.querySelectorAll('script[type="application/ld+json"]')) {
    let data
    try {
      data = JSON.parse(node.text)
    } catch (error) {
      report.check(false, at(`invalid JSON-LD: ${error.message}`))
      continue
    }
    for (const thing of Array.isArray(data) ? data : [data]) {
      report.check(
        thing['@context'] === 'https://schema.org',
        at('JSON-LD @context is not schema.org'),
      )
      report.check(typeof thing['@type'] === 'string', at('JSON-LD node has no @type'))
      // Fabricated trust signals. These are Google spam-policy violations and
      // the previous site's zero-price PreOrder offer was in this family.
      for (const forbidden of ['aggregateRating', 'review', 'ratingValue', 'reviewCount']) {
        report.check(
          !(forbidden in thing),
          at(`JSON-LD contains "${forbidden}" — PixelFerry has no ratings and must not claim any`),
        )
      }
      report.check(
        !('offers' in thing),
        at('JSON-LD contains "offers" — there is no price or purchasable product yet'),
      )
    }
  }

  // ── Images ──────────────────────────────────────────────────────────────
  for (const img of dom.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? '(no src)'
    report.check(img.getAttribute('alt') !== undefined, at(`<img ${src}> has no alt attribute`))
    report.check(
      img.getAttribute('width') && img.getAttribute('height'),
      at(`<img ${src}> has no intrinsic width/height — a CLS risk`),
    )
  }

  // ── CSP-critical output shape ───────────────────────────────────────────
  // The header CSP carries no 'unsafe-inline'. These two assertions are what
  // make that claim true rather than aspirational.
  for (const script of dom.querySelectorAll('script')) {
    const type = script.getAttribute('type')
    if (type === 'application/ld+json') continue // a data block, not executable
    report.check(
      script.getAttribute('src'),
      at("inline <script> found — script-src has no 'unsafe-inline'"),
    )
  }
  report.check(
    dom.querySelectorAll('style').length === 0,
    at("inline <style> found — style-src has no 'unsafe-inline'"),
  )
  const styled = dom.querySelectorAll('[style]')
  report.check(
    styled.length === 0,
    at(`${styled.length} element(s) carry a style attribute — style-src has no 'unsafe-inline'`),
  )
}

// ── Sitemap ───────────────────────────────────────────────────────────────
const sitemapIndex = await readFile(path.join(DIST, 'sitemap-index.xml'), 'utf8').catch(() => null)
report.check(sitemapIndex, 'dist/sitemap-index.xml was not generated')

const sitemap = await readFile(path.join(DIST, 'sitemap-0.xml'), 'utf8').catch(() => null)
report.check(sitemap, 'dist/sitemap-0.xml was not generated')

if (sitemap) {
  /*
   * The sitemap writer emits the site root as a bare origin (`https://host`)
   * rather than `https://host/`. RFC 3986 §6.2.3 makes those the same URL —
   * an empty path in an http(s) URI is equivalent to "/" — so both are
   * normalised before comparison rather than reported as a mismatch.
   */
  const norm = (url) => (url === ORIGIN ? `${ORIGIN}/` : url)
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(m[1]))
  const expected = live.map((page) =>
    page.urlPath === '/' ? `${ORIGIN}/` : `${ORIGIN}${page.urlPath}`,
  )

  for (const url of expected) {
    report.check(locs.includes(url), `sitemap is missing ${url}`)
  }
  for (const loc of locs) {
    report.check(expected.includes(loc), `sitemap lists ${loc}, which is not an indexable page`)
    report.check(!loc.includes('?'), `sitemap contains a query-string URL: ${loc}`)
    report.check(loc.startsWith(ORIGIN), `sitemap URL is not on ${ORIGIN}: ${loc}`)
  }
  report.check(!locs.some((loc) => loc.includes('/404')), 'sitemap must not list the 404 page')
  // Faking lastmod on every URL every build tells Search the whole site
  // changed, which is untrue and erodes crawl trust.
  report.check(!sitemap.includes('<lastmod>'), 'sitemap emits <lastmod> — see astro.config.mjs')
}

// ── robots.txt ────────────────────────────────────────────────────────────
const robotsTxt = await readFile(path.join(DIST, 'robots.txt'), 'utf8').catch(() => null)
report.check(robotsTxt, 'dist/robots.txt is missing')
if (robotsTxt) {
  report.check(
    robotsTxt.includes(`${ORIGIN}/sitemap-index.xml`),
    'robots.txt must point at the generated sitemap-index.xml',
  )
  report.check(!/^Disallow:\s*\/\s*$/m.test(robotsTxt), 'robots.txt disallows the whole site')
}

// ── 404 ───────────────────────────────────────────────────────────────────
const notFound = pages.find((page) => page.rel === '404.html')
report.check(notFound, 'dist/404.html was not generated — Cloudflare needs it for a real 404')
if (notFound) {
  report.check((meta(notFound.dom, 'robots') ?? '').includes('noindex'), '404 page must be noindex')
}

console.log(`  scanned ${pages.length} pages (${live.length} indexable)`)
report.finish()
