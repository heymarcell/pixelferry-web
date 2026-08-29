import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { limits } from '../src/data/product'

const CONTENT = path.join(path.dirname(import.meta.dirname), 'src', 'content')

/**
 * THE 8-BIT INVARIANT.
 *
 * PixelFerry's pipeline is 8 bits per channel end to end: every encoder branch
 * in the app's `applyFormat` is called without a `bitdepth` option, so libvips
 * writes 8-bit whatever the source was. Measured, from a 16-bit `rgb16` source:
 * `png({compressionLevel:9})`, `tiff({compression:'lzw'})`,
 * `webp({lossless:true})` and `avif({lossless:true})` all read back as
 * `depth: 'uchar'`. On the macOS HEIC path, `sips -s format tiff` genuinely
 * produces a 16-bit intermediate, and the final encode drops it.
 *
 * "Lossless" is therefore a statement about the CODEC, not about the
 * conversion. /convert/heic-to-png shipped both halves of that distinction at
 * once — "adds no new quality loss" and "you get a perfect copy" in the
 * frontmatter, "a 10-bit HEIC is quantised on the way through" forty lines
 * below — and every automated check passed, because each sentence is only
 * wrong in the presence of the other.
 *
 * These tests exist so that specific contradiction cannot return.
 */

async function contentFiles() {
  const out: { name: string; text: string }[] = []
  for (const dir of ['conversions', 'guides']) {
    for (const f of await readdir(path.join(CONTENT, dir))) {
      if (f.endsWith('.md'))
        out.push({
          name: `${dir}/${f}`,
          text: await readFile(path.join(CONTENT, dir, f), 'utf8'),
        })
    }
  }
  return out
}

/** Absolutes that an 8-bit pipeline cannot deliver, in any context. */
const BANNED = [
  { re: /\bperfect copy\b/i, why: 'an 8-bit re-encode of a >8-bit source is not a perfect copy' },
  { re: /adds no (?:new|further) (?:quality )?loss/i, why: 'quantisation to 8 bits is a new loss' },
  { re: /picks up no new compression artefacts/i, why: 'true of DEFLATE, false of the conversion' },
  { re: /\blossless(?:ly)? end[- ]to[- ]end\b/i, why: 'the pipeline is not lossless end to end' },
  { re: /preserves? (?:the )?(?:full )?(?:10|12|14|16)[- ]bit/i, why: 'output is always 8-bit' },
  { re: /\b(?:no|zero) (?:quality )?loss whatsoever\b/i, why: 'unqualifiable absolute' },
]

/** Words that assert exactness, and so require the 8-bit scope on the page. */
const EXACTNESS =
  /pixel[- ]exact|every pixel(?:[^.]{0,40})exactly|stores every pixel|reproduces every pixel|bit[- ]for[- ]bit/i

/** An acceptable scoping qualifier: the page says 8-bit somewhere. */
const SCOPED = /8[- ]bit/i

describe('the 8-bit pipeline invariant', () => {
  it('records the measured output depth as a fact, not prose', () => {
    expect(limits.bitDepth.output).toBe(8)
  })

  it('no page states an absolute that an 8-bit pipeline cannot deliver', async () => {
    const offenders: string[] = []
    for (const { name, text } of await contentFiles()) {
      for (const { re, why } of BANNED) {
        const hit = text.match(re)
        if (hit) offenders.push(`${name}: "${hit[0]}" — ${why}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('every exactness claim is scoped to 8 bits on the same page', async () => {
    const offenders: string[] = []
    for (const { name, text } of await contentFiles()) {
      const hit = text.match(EXACTNESS)
      if (hit && !SCOPED.test(text)) {
        offenders.push(`${name}: claims "${hit[0]}" but never says 8-bit`)
      }
    }
    expect(offenders).toEqual([])
  })

  /*
   * The subtler half of the same defect. A page may truthfully say that AVIF or
   * TIFF *as a format* carries more than 8 bits — but presenting that as an
   * available capability, next to PixelFerry's name, reads as a product claim
   * this pipeline cannot honour. /convert/jpg-to-avif had a bullet literally
   * headed "Higher bit depth becomes available". It does not become available.
   *
   * The app already enforces the same rule on itself: `shared/settings.ts`
   * forbids the format blurbs from saying "HDR" for exactly this reason.
   */
  it('presents >8-bit capability of a writable format only with the 8-bit scope', async () => {
    const WRITABLE = /\b(AVIF|TIFF|WebP|PNG|HEIC)\b/i
    const CAPABILITY =
      /\b(?:1[026]|12)[- ]bit\b[^.]{0,80}\b(?:nativ|capable|handles?|supports?|available)|(?:handles?|supports?|capable of)[^.]{0,40}\b(?:1[026]|12)[- ]bit\b/i
    const SCOPE = /PixelFerry\s+(?:writes|encodes|does not write|outputs)[^.]{0,60}8-bit/i

    // A NEGATED mention is the opposite of a product claim — "16-bit PSDs are
    // not supported" must not trip a guard aimed at "10-bit is available".
    const NEGATED = /\b(?:not|never|no|cannot|can't|does not|don't|without)\b/i

    const offenders: string[] = []
    for (const { name, text } of await contentFiles()) {
      for (const para of text.split(/\n\s*\n/)) {
        if (!WRITABLE.test(para)) continue
        const hit = para.match(CAPABILITY)
        if (!hit || NEGATED.test(hit[0]) || SCOPE.test(text)) continue
        offenders.push(`${name}: "${hit[0].replace(/\s+/g, ' ')}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('heic-to-png keeps the bit-depth caveat that makes its claims true', async () => {
    const text = await readFile(path.join(CONTENT, 'conversions', 'heic-to-png.md'), 'utf8')
    // Remove either half and the page contradicts itself again.
    expect(text).toMatch(/PixelFerry writes 8-bit PNG/)
    expect(text).toMatch(/quantised/i)
  })
})

/**
 * `docs/content-sources.md` is the evidence document. It had accumulated rows
 * that its own later sections contradicted — the no-browser-HEIC claim, the
 * misattributed 26% figure, and a 7x decode ratio sourced to a README the same
 * file elsewhere says is not authoritative. A source document that contradicts
 * itself is worse than none, so it was cleaned rather than appended to, and
 * these keep it clean.
 */
describe('the evidence document states only what is currently defensible', () => {
  let sources: string
  /** The asserting part — everything before the explicit removal list. */
  let asserted: string

  beforeAll(async () => {
    sources = await readFile(
      path.join(path.dirname(import.meta.dirname), 'docs', 'content-sources.md'),
      'utf8',
    )
    // The "deliberately not claimed" list NAMES the false phrases on purpose.
    // Guards must read only the part of the document that asserts.
    asserted = sources.split('## What is deliberately')[0]!
    expect(asserted.length).toBeGreaterThan(1000)
  })

  it('does not assert that no browser displays HEIC', () => {
    expect(asserted).not.toMatch(/no browsers? displays? \*{0,2}HEIC/i)
    expect(asserted).toMatch(/Safari has displayed HEIC/)
    // ...and the removal list still records it as a known-false phrase.
    expect(sources).toMatch(/No browser displays HEIC/)
  })

  it('does not attribute the 26% figure to the lossless study', () => {
    expect(asserted).not.toMatch(/Lossless and Alpha Study[^|\n]{0,80}\b26\s?%/i)
    expect(sources).toMatch(/23%/)
    expect(sources).toMatch(/42%/)
  })

  it('carries no README-sourced 7x decode ratio as evidence', () => {
    expect(asserted).not.toMatch(/~?7\s?[x×][^\n]{0,60}(?:faster|speed)/i)
    // The real measurement, with its conditions, is present instead.
    expect(sources).toMatch(/12\.2/)
    expect(sources).toMatch(/153 ms/)
  })

  it('puts executable source above the README in the trust order', () => {
    const src = sources.indexOf('Executable source')
    const readme = sources.indexOf('README and docs, last')
    expect(src).toBeGreaterThan(-1)
    expect(readme).toBeGreaterThan(src)
  })

  it('separates TIFF the container from what PixelFerry writes', () => {
    expect(sources).toMatch(/TIFF is a \*\*container\*\*/)
    expect(sources).not.toMatch(/TIFF[^\n]{0,30}\bis lossless\b/i)
  })

  it('marks the PR #70 rows as not true on app main', () => {
    expect(sources).toMatch(/Requires PR #70 — not true on app main today/i)
  })
})
