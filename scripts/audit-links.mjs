#!/usr/bin/env node
/**
 * Internal link and asset audit over `dist/`.
 *
 * Resolves every internal href and every asset reference against what the
 * build actually emitted, using the same filename→URL mapping Cloudflare will
 * use. A dead footer link is the kind of defect that survives review forever
 * because nobody clicks it.
 *
 *   npm run audit:links   (after npm run build)
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { DIST, ORIGIN, Report, loadPages } from './lib/pages.mjs'

const report = new Report('Link audit')
const pages = await loadPages()

/** Every URL path the deployment will serve an HTML page at. */
const routes = new Set(pages.map((page) => page.urlPath))

/** Anchor targets available on each page, so `#waitlist` can be verified. */
const anchors = new Map(
  pages.map((page) => [
    page.urlPath,
    new Set(page.dom.querySelectorAll('[id]').map((node) => node.getAttribute('id'))),
  ]),
)

/** A static asset exists if the file is in dist/. */
function assetExists(urlPath) {
  const clean = urlPath.split('?')[0].split('#')[0]
  return existsSync(path.join(DIST, decodeURIComponent(clean)))
}

let internal = 0
let external = 0

for (const page of pages) {
  const at = (msg) => `${page.rel}: ${msg}`

  for (const anchor of page.dom.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? ''
    const text = anchor.text.trim()

    // Every link needs an accessible name — text, or an aria-label.
    report.check(
      text.length > 0 || anchor.getAttribute('aria-label'),
      at(`link to ${href} has no accessible name`),
    )

    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue

    if (/^https?:\/\//.test(href)) {
      external += 1
      // An absolute link to our own origin should be a relative one, or it
      // bypasses the trailing-slash policy and the canonical agreement.
      report.check(
        !href.startsWith(ORIGIN),
        at(`absolute self-link ${href} — use a site-relative path`),
      )
      continue
    }

    internal += 1
    const [rawPath, hash] = href.split('#')
    const target = rawPath === '' ? page.urlPath : rawPath

    report.check(target.startsWith('/'), at(`relative href "${href}" — use an absolute path`))
    report.check(
      target === '/' || !target.endsWith('/'),
      at(`href "${href}" has a trailing slash; the site policy is 'never'`),
    )

    const isRoute = routes.has(target)
    const isAsset = !isRoute && assetExists(target)
    report.check(isRoute || isAsset, at(`broken internal link: ${href}`))

    if (hash && isRoute) {
      report.check(
        anchors.get(target)?.has(hash),
        at(`link ${href} points at #${hash}, which does not exist on ${target}`),
      )
    }
  }

  // ── Assets ──────────────────────────────────────────────────────────────
  for (const [selector, attribute] of [
    ['img[src]', 'src'],
    ['script[src]', 'src'],
    ['link[href]', 'href'],
    ['source[srcset]', 'srcset'],
    ['img[srcset]', 'srcset'],
  ]) {
    for (const node of page.dom.querySelectorAll(selector)) {
      const raw = node.getAttribute(attribute) ?? ''
      if (!raw || /^(https?:|data:|mailto:)/.test(raw)) continue

      // srcset is a comma-separated list of "url descriptor" pairs.
      const urls =
        attribute === 'srcset' ? raw.split(',').map((part) => part.trim().split(/\s+/)[0]) : [raw]

      for (const url of urls) {
        if (!url || !url.startsWith('/')) continue
        // A `link rel=canonical/sitemap` href is a route, not a file.
        if (routes.has(url)) continue
        report.check(assetExists(url), at(`missing asset referenced by ${attribute}: ${url}`))
      }
    }
  }
}

console.log(`  ${internal} internal links, ${external} external, across ${pages.length} pages`)
report.finish()
