import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'

export const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))))
export const DIST = path.join(ROOT, 'dist')
export const ORIGIN = 'https://pixelferry.app'

/** Walk `dir` and return every file path matching `test`. */
export async function walk(dir, test = () => true) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await walk(full, test)))
    else if (test(full)) found.push(full)
  }
  return found
}

/**
 * Every built HTML page, with its parsed DOM and the public URL path
 * Cloudflare will serve it at.
 *
 * The mapping matters: `build.format: 'file'` writes `privacy.html`, and
 * Cloudflare's `html_handling: "auto-trailing-slash"` serves that at
 * `/privacy`. The audits check the URL people actually get, not the filename.
 */
export async function loadPages() {
  const files = await walk(DIST, (f) => f.endsWith('.html'))
  return Promise.all(
    files.map(async (file) => {
      const html = await readFile(file, 'utf8')
      const rel = path.relative(DIST, file).replace(/\\/g, '/')
      const urlPath =
        rel === 'index.html' ? '/' : '/' + rel.replace(/\.html$/, '').replace(/\/index$/, '')
      return { file, rel, urlPath, html, dom: parse(html, { comment: false }) }
    }),
  )
}

/** Pages that are meant to be indexed — i.e. everything except the 404. */
export function indexable(pages) {
  return pages.filter((page) => {
    const robots = page.dom.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
    return !robots.includes('noindex')
  })
}

export function meta(dom, name) {
  return dom.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null
}

export function prop(dom, property) {
  return dom.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? null
}

/**
 * THE COMPLETE PUBLIC CLAIM SURFACE of a built page.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * A truth sweep that strips tags from raw HTML and greps the remainder cannot
 * see head metadata at all: `<meta name="description" content="…">` has no text
 * node, so removing the element removes the entire claim. A review reported
 * "zero actionable findings" from exactly that shape of sweep while this was
 * live in a meta description, an og:description, a twitter:description and the
 * JSON-LD:
 *
 *   "why resizing beats any codec choice for saving bytes"
 *
 * The same blindness applied to text outside `<main>` (footer, `<noscript>`)
 * and to accessibility strings — an `aria-label` is read aloud to a real
 * person, so a false claim in one is published, not hidden.
 *
 * ── What this is and is not ────────────────────────────────────────────────
 *
 * This is COVERAGE INFRASTRUCTURE. It decides which strings a human or a test
 * gets to look at. It does not decide whether any of them are true — no regex
 * does. Its only job is that nothing published is invisible to review.
 *
 * Implementation data — classes, ids, hrefs, hashes, CSS, script bodies — is
 * deliberately excluded. It is not a claim and it drowns the signal.
 */
export function claimSurface(page) {
  const { dom } = page

  const clean = (html) =>
    html
      .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/\s+/g, ' ')
      .trim()

  /** `<main>` only — what the duplication audit measures. */
  const mainEl = dom.querySelector('main')
  const mainText = clean(mainEl ? mainEl.innerHTML : dom.innerHTML)

  /** The whole body: header, main, FOOTER and `<noscript>` included. */
  const bodyEl = dom.querySelector('body') ?? dom
  const bodyText = clean(bodyEl.innerHTML)

  /**
   * Public strings that only assistive tech or a tooltip ever surfaces. These
   * are read aloud to real people, so a false claim here is published.
   * Decorative alt (`alt=""`) and icon-sized labels carry no claim.
   */
  const accessible = []
  for (const el of dom.querySelectorAll('[aria-label], [aria-description], [title], img[alt]')) {
    for (const attr of ['aria-label', 'aria-description', 'title', 'alt']) {
      const value = el.getAttribute(attr)
      if (value && value.trim().length > 2) accessible.push(value.trim())
    }
  }
  const accessibleText = [...new Set(accessible)].join(' \u2022 ')

  const headClaims = {
    title: dom.querySelector('title')?.text?.trim() ?? null,
    description: meta(dom, 'description'),
    ogTitle: prop(dom, 'og:title'),
    ogDescription: prop(dom, 'og:description'),
    ogImageAlt: prop(dom, 'og:image:alt'),
    twitterTitle: meta(dom, 'twitter:title'),
    twitterDescription: meta(dom, 'twitter:description'),
    twitterImageAlt: meta(dom, 'twitter:image:alt'),
  }

  /*
   * Factual values inside the JSON-LD graph, at any depth. Identifiers and URLs
   * are not claims; NUMBERS AND BOOLEANS ARE — a fake `ratingValue` or
   * `price` would be a structured-data lie, so primitives are collected too.
   */
  const SKIP = new Set(['@context', '@type', '@id', 'url', 'item', 'sameAs', 'inLanguage'])
  const jsonLdValues = []
  const collect = (node) => {
    if (typeof node === 'string') {
      if (!/^https?:\/\//.test(node)) jsonLdValues.push(node)
      return
    }
    if (typeof node === 'number' || typeof node === 'boolean') {
      jsonLdValues.push(String(node))
      return
    }
    if (Array.isArray(node)) return node.forEach(collect)
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) if (!SKIP.has(key)) collect(value)
    }
  }
  for (const script of dom.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(script.text))
    } catch {
      jsonLdValues.push(`UNPARSEABLE JSON-LD in ${page.rel}`)
    }
  }

  const surface = {
    mainText,
    bodyText,
    accessibleText,
    ...headClaims,
    jsonLdText: jsonLdValues.join(' \u2022 '),
    /** Back-compat with callers written against the first version. */
    visibleText: mainText,
  }

  /** Head + JSON-LD only — the half a tag-stripping sweep cannot see. */
  surface.metadataOnly = [...Object.values(headClaims), surface.jsonLdText]
    .filter(Boolean)
    .join(' \u2022 ')

  /** Everything a human or a crawler can read. The review surface. */
  surface.all = [surface.bodyText, surface.accessibleText, surface.metadataOnly]
    .filter(Boolean)
    .join(' \u2022 ')

  return surface
}

/** Collect failures then report once, so one run shows every problem. */
export class Report {
  constructor(label) {
    this.label = label
    this.failures = []
    this.warnings = []
    this.checks = 0
  }

  check(condition, message) {
    this.checks += 1
    if (!condition) this.failures.push(message)
  }

  warn(condition, message) {
    this.checks += 1
    if (!condition) this.warnings.push(message)
  }

  finish() {
    for (const warning of this.warnings) console.warn(`  ⚠ ${warning}`)
    if (this.failures.length > 0) {
      console.error(`\n✗ ${this.label}: ${this.failures.length} failure(s)\n`)
      for (const failure of this.failures) console.error(`  ✗ ${failure}`)
      console.error('')
      process.exit(1)
    }
    console.log(
      `✓ ${this.label}: ${this.checks} checks passed` +
        (this.warnings.length ? ` (${this.warnings.length} warning(s))` : ''),
    )
  }
}
