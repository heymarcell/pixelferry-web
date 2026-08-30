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

  it('records the app main SHA and how to resolve it', () => {
    // The evidence file must name the ref it was checked against, and must say
    // how to get it — reading a local checkout is what produced two bad pins.
    expect(sources).toMatch(/App `origin\/main`/)
    expect(sources).toMatch(/rev-parse origin\/main/)
    expect(sources).toMatch(/never from a local\s+checkout/)
  })
})

/**
 * FOUR RECURRENCE CLASSES, each already demonstrated on this branch.
 *
 * These run over BUILT HTML, not source, because that is what a reader sees —
 * and with `<pre>`/`<code>` stripped first, so a `sips … formatOptions 85`
 * example is structurally allowlisted rather than pattern-matched around.
 *
 * Deliberately narrow. This is not a truth engine; it is four specific shapes
 * that came back after being removed once.
 */
describe('claim shapes that have already recurred', () => {
  let pages: { name: string; text: string }[]

  beforeAll(async () => {
    const dist = path.join(path.dirname(import.meta.dirname), 'dist')
    const entries = await readdir(dist, { recursive: true, withFileTypes: true })
    pages = []
    for (const e of entries) {
      if (!e.isFile() || !/\.(html|txt)$/.test(e.name) || e.name === 'robots.txt') continue
      const raw = await readFile(path.join(e.parentPath ?? dist, e.name), 'utf8')
      const text = raw
        .replace(/<(script|style|pre|code)[^>]*>[\s\S]*?<\/\1>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
        .replace(/&[a-z]+;/g, ' ')
        .replace(/\s+/g, ' ')
      pages.push({ name: path.relative(dist, path.join(e.parentPath ?? dist, e.name)), text })
    }
    expect(pages.length).toBeGreaterThan(15)
  })

  const scan = (re: RegExp) =>
    pages.flatMap(({ name, text }) =>
      [
        ...text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')),
      ].map((m) => `${name}: "${m[0].trim()}"`),
    )

  /*
   * A. CROSS-CODEC QUALITY EQUIVALENCE. /convert/jpg-to-avif said a sky that
   * bands "at JPEG quality 60" holds together "at an equivalent AVIF setting" —
   * while the same page correctly said the scales do not convert. The earlier
   * guard only caught the form "equivalent to AVIF 60".
   */
  it('never implies a quality value transfers between codecs', () => {
    const forms = [
      /\b(?:JPEG|JPG|WebP|AVIF|HEIC)\s+quality\s+\d{1,3}[^.]{0,80}\bequivalent\b/i,
      /\bequivalent\b[^.]{0,60}\b(?:JPEG|JPG|WebP|AVIF|HEIC)\s+(?:quality\s+)?\d{1,3}\b/i,
      /\bequivalent\s+(?:JPEG|JPG|WebP|AVIF|HEIC)\s+setting\b/i,
      /\b(?:JPEG|JPG|WebP|AVIF|HEIC)\s*\d{1,3}\s*(?:≈|~=|=)\s*(?:JPEG|JPG|WebP|AVIF|HEIC)\s*\d{1,3}/i,
    ]
    expect(forms.flatMap(scan)).toEqual([])
  })

  /*
   * B. UNSUPPORTED QUALITY BANDS. 85-90, 80-85 and 55-65 were each removed as
   * invented and each came back. Command examples are excluded structurally
   * above, so any remaining hit is editorial prose.
   */
  it('prescribes no invented quality band in prose', () => {
    expect(
      scan(
        /\b(?:5[0-9]|[6-9][0-9])\s*[–-]\s*(?:[6-9][0-9]|100)\b(?=[^%]{0,40}quality|\s*(?:quality|for JPEG))/i,
      ),
    ).toEqual([])
    expect(scan(/\bquality\s+(?:5[0-9]|[6-9][0-9])\s*[–-]\s*(?:[6-9][0-9]|100)\b/i)).toEqual([])
  })

  /*
   * C. GENERIC CODEC RANKINGS. "the smallest current web format" was the page
   * TITLE; "usually the smallest" and "the slowest to encode" were the summary.
   * A scoped sentence — naming the content type, the encoder or the conditions —
   * is fine and is what those were replaced with.
   */
  it('asserts no unscoped codec ranking', () => {
    const SCOPE =
      // A sentence supplying its own causal mechanism is not the bare
      // ranking this guard is aimed at.
      /(?:on photographic|depends on|of these four|PixelFerry|measured|effort level|this encoder|though it|\bbecause\b)/i
    const offenders = pages.flatMap(({ name, text }) =>
      [...text.matchAll(/[^.]*\b(?:the|usually the|is the)\s+(?:smallest|slowest)\b[^.]*\./gi)]
        .map((m) => m[0].trim())
        .filter((s) => !SCOPE.test(s))
        .filter((s) => !/smallest result/i.test(s)) // the target-size search, a product fact
        .map((s) => `${name}: "${s.slice(0, 90)}"`),
    )
    expect(offenders).toEqual([])
  })

  /*
   * D. UNSOURCED SIZE MULTIPLIER. "A result many times the size of the HEIC is
   * normal" survived a pass whose report said unsupported multipliers were
   * removed.
   */
  it('states no unsourced size multiple', () => {
    expect(scan(/\bmany times\b[^.]{0,40}\b(?:the size|larger|bigger)\b/i)).toEqual([])
    expect(scan(/\bseveral times\b[^.]{0,30}\b(?:the size|larger|bigger)\b/i)).toEqual([])
  })
})
