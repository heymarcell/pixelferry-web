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
 * A truth sweep that strips tags from the raw HTML and greps the remainder
 * cannot see head metadata AT ALL: `<meta name="description" content="…">` has
 * no text node, so removing the element removes the entire claim. A review pass
 * reported "zero actionable findings" from exactly that shape of sweep while
 * this was live in a meta description:
 *
 *   "why resizing beats any codec choice for saving bytes"
 *
 * The claim was indexable, shown in search results, and false. It survived
 * because the sweep deleted the element that carried it.
 *
 * A title, a meta description, an OG/Twitter description and a JSON-LD string
 * are published factual claims. They are frequently the ONLY thing a person
 * reads before deciding whether to click. They must be audited as prose.
 *
 * Uses the parsed DOM, never a regex over stripped text — parsing is what makes
 * the attribute reachable in the first place.
 *
 * `visibleText` is deliberately separate from the rest: the duplication audit
 * measures visible prose only, and folding metadata into it would change what
 * that measurement means.
 */
export function claimSurface(page) {
  const { dom } = page

  const main = dom.querySelector('main') ?? dom
  const visibleText = main.innerHTML
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  /* Every factual string inside the JSON-LD graph, at any depth. `@id`, URLs
   * and type names are identifiers rather than prose, so they are skipped. */
  const SKIP = new Set(['@context', '@type', '@id', 'url', 'item', 'sameAs', 'inLanguage'])
  const jsonLdStrings = []
  const collect = (node) => {
    if (typeof node === 'string') {
      if (!/^https?:\/\//.test(node)) jsonLdStrings.push(node)
      return
    }
    if (Array.isArray(node)) return node.forEach(collect)
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (!SKIP.has(key)) collect(value)
      }
    }
  }
  for (const script of dom.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(script.text))
    } catch {
      jsonLdStrings.push(`UNPARSEABLE JSON-LD in ${page.rel}`)
    }
  }

  const surface = {
    visibleText,
    title: dom.querySelector('title')?.text?.trim() ?? null,
    description: meta(dom, 'description'),
    ogTitle: prop(dom, 'og:title'),
    ogDescription: prop(dom, 'og:description'),
    ogImageAlt: prop(dom, 'og:image:alt'),
    twitterTitle: meta(dom, 'twitter:title'),
    twitterDescription: meta(dom, 'twitter:description'),
    twitterImageAlt: meta(dom, 'twitter:image:alt'),
    jsonLdText: jsonLdStrings.join(' \u2022 '),
  }

  /** Everything a human or a crawler can read, as one string. */
  surface.all = Object.entries(surface)
    .filter(([key]) => key !== 'all')
    .map(([, value]) => value)
    .filter(Boolean)
    .join(' \u2022 ')

  /** Head metadata alone — the half the old sweep could not see. */
  surface.metadataOnly = [
    surface.title,
    surface.description,
    surface.ogTitle,
    surface.ogDescription,
    surface.ogImageAlt,
    surface.twitterTitle,
    surface.twitterDescription,
    surface.twitterImageAlt,
    surface.jsonLdText,
  ]
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
