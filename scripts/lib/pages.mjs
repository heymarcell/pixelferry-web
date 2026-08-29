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
