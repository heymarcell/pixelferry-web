import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { product, readableFormats, writableFormats, limits } from '../src/data/product'

/**
 * Guards against product-claim drift.
 *
 * The website said "macOS 13+" in four places — including in JSON-LD — while
 * the app had always required macOS 14. Nothing caught it because nothing was
 * looking. These tests look.
 *
 * Sources of truth, both in the private `heymarcell/pixelferry-app` repo:
 *   CLAUDE.md  — "macOS-only batch image converter (macOS 14+)"
 *   shared/settings.ts, shared/constants.ts — the format and quality sets
 *   main/pipeline.ts, main/main.ts             — what the pipeline does
 *
 * The README is deliberately NOT listed. It is checked last, if at all.
 */

const ROOT = path.dirname(import.meta.dirname)

/** Every file whose text is served to the public. */
async function publicSources(): Promise<{ file: string; text: string }[]> {
  const roots = ['src', 'public']
  const files: string[] = []

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (/\.(astro|ts|md|html|txt)$/.test(entry.name)) files.push(full)
    }
  }
  for (const root of roots) await walk(path.join(ROOT, root))

  return Promise.all(
    files.map(async (file) => ({
      file: path.relative(ROOT, file),
      text: await readFile(file, 'utf8'),
    })),
  )
}

describe('product facts', () => {
  it('states macOS 14 as the minimum', () => {
    expect(product.minimumOS.version).toBe('14')
    expect(product.minimumOS.label).toBe('macOS 14 (Sonoma) or later')
    expect(product.minimumOS.short).toBe('macOS 14+')
  })

  it('caps PDF conversion at 100 pages', () => {
    expect(limits.pdfPageCap).toBe(100)
  })

  /*
   * The output set, and the ones that are genuinely never written, are pinned
   * against the app's executable source in `format-model.test.ts`. The
   * invariant that used to live here — "never claims HEIC as an output" —
   * asserted a stale line in the app README and was FALSE: the app has written
   * HEIC via `encodeHeicViaSips` all along. Deleted rather than relaxed, because
   * a test that enforces a wrong fact is worse than no test. The README has
   * since been corrected upstream; the lesson about where to read has not.
   */
  it('never claims PSD, PDF or SVG as an output', () => {
    const outputs = writableFormats.map((f) => f.label.toUpperCase())
    for (const readOnly of ['PSD', 'PDF', 'SVG', 'RAW']) {
      expect(outputs.join(' ')).not.toContain(readOnly)
    }
  })

  it('marks the macOS-only decoders as macOS-only', () => {
    const raw = readableFormats.find((f) => f.label === 'Camera RAW')
    expect(raw?.read).toBe('macos')
  })
})

describe('no stale claims in public content', () => {
  it('never says an obsolete minimum macOS version', async () => {
    // The exact defect that shipped: "macOS 13+" in the hero and
    // "macOS 13.0 or later" in the SoftwareApplication JSON-LD.
    const stale = /macOS\s*(?:9|10(?:\.\d+)?|11|12|13)(?:\.\d+)?\s*(?:\+|or later|or newer)?/i
    const offenders: string[] = []
    for (const { file, text } of await publicSources()) {
      // The guard's own description of the bug is allowed to name it.
      if (file === 'src/data/product.ts') continue
      const match = text.match(stale)
      if (match) offenders.push(`${file}: "${match[0]}"`)
    }
    expect(offenders).toEqual([])
  })

  it('never markets the app as technically "native"', async () => {
    // It is Electron + React + Sharp. "native-feeling" is honest;
    // "a native macOS app" is not, and the old copy said the latter.
    const offenders: string[] = []
    for (const { file, text } of await publicSources()) {
      if (file === 'src/data/product.ts') continue
      // Allow "native-feeling", "natively", "macOS system codecs"; catch
      // "native app", "native Mac", "native batch", "natively built".
      for (const match of text.matchAll(/\bnative\b(?!-feeling)([^.\n]{0,40})/gi)) {
        const tail = match[1] ?? ''
        if (/\b(app|application|mac|macos|converter|batch|cocoa|swift)\b/i.test(tail)) {
          offenders.push(`${file}: "native${tail.slice(0, 40)}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('never claims a price, a rating or a download count', async () => {
    const banned = [
      /aggregateRating/,
      /"ratingValue"/,
      /"priceCurrency"/,
      /\bPreOrder\b/,
      /\b\d[\d,]*\+? downloads\b/i,
    ]
    const offenders: string[] = []
    for (const { file, text } of await publicSources()) {
      if (file.startsWith('src/lib/schema.ts')) continue // documents why they are absent
      for (const pattern of banned) {
        const match = text.match(pattern)
        if (match) offenders.push(`${file}: "${match[0]}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})
