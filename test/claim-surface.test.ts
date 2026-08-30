import { beforeAll, describe, expect, it } from 'vitest'
// The plain-ESM helper the audit scripts share; TypeScript infers it from JS.
import { loadPages, claimSurface } from '../scripts/lib/pages.mjs'

type Surface = {
  mainText: string
  bodyText: string
  accessibleText: string
  visibleText: string
  title: string | null
  description: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageAlt: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  twitterImageAlt: string | null
  jsonLdText: string
  all: string
  metadataOnly: string
}

type Page = { rel: string; surface: Surface }

/**
 * THE PUBLIC CLAIM SURFACE — including the head.
 *
 * ── The failure these tests exist for ──────────────────────────────────────
 *
 * A previous truth sweep stripped tags from the built HTML and grepped the
 * remainder. `<meta name="description" content="…">` has no text node, so
 * removing the element removed the entire claim. That sweep reported "zero
 * actionable findings" while this was live, in four places on one page:
 *
 *   "why resizing beats any codec choice for saving bytes"
 *
 * — meta description, og:description, twitter:description and the JSON-LD
 * description. Indexable, shown in search results, and false.
 *
 * A title and a meta description are published factual claims, and often the
 * ONLY thing a person reads before deciding whether to click. These tests read
 * them through the parsed DOM, which is the only way the attribute is reachable.
 */
describe('the public claim surface', () => {
  let pages: Page[]

  beforeAll(async () => {
    const loaded = await loadPages()
    pages = loaded.map((page: { rel: string }) => ({
      rel: page.rel,
      surface: claimSurface(page) as unknown as Surface,
    }))
    expect(pages.length).toBeGreaterThan(15)
  })

  /** Every field a claim can hide in, checked one at a time so the report names it. */
  const FIELDS: (keyof Surface)[] = [
    'bodyText',
    'accessibleText',
    'title',
    'description',
    'ogTitle',
    'ogDescription',
    'ogImageAlt',
    'twitterTitle',
    'twitterDescription',
    'twitterImageAlt',
    'jsonLdText',
  ]

  const scan = (re: RegExp) =>
    pages.flatMap(({ rel, surface }) =>
      FIELDS.flatMap((field) => {
        const value = surface[field]
        if (typeof value !== 'string' || !value) return []
        const hit = value.match(re)
        return hit ? [`${rel} [${field}]: "${hit[0].trim()}"`] : []
      }),
    )

  it('covers text outside <main>, and accessibility strings', () => {
    const home = pages.find((p) => p.rel === 'index.html')!.surface
    // The footer lives outside <main>; a claim there is published all the same.
    expect(home.bodyText.length).toBeGreaterThan(home.mainText.length)
    expect(home.bodyText).toContain('Private beta')
    expect(home.mainText).not.toContain('Private beta')
    // An aria-label is read aloud, so it is a published claim.
    expect(home.accessibleText).toContain('PixelFerry window')
  })

  it('actually reaches head metadata — the surface the old sweep could not see', () => {
    // A structural check, not a content one: if this ever comes back empty the
    // guards below are silently inspecting nothing.
    const withMetadata = pages.filter((p) => (p.surface.metadataOnly ?? '').length > 50)
    expect(withMetadata.length).toBeGreaterThan(15)
    for (const page of pages) {
      if (page.rel === '404.html') continue
      expect(page.surface.description, `${page.rel} has no meta description`).toBeTruthy()
      expect(page.surface.title, `${page.rel} has no title`).toBeTruthy()
    }
  })

  /*
   * C. The resize absolute. A codec change can beat a resize depending on the
   * source, the destination codec, how much resizing there is, the content and
   * the encoder settings. The useful point — an oversized image wastes pixels —
   * survives without the absolute.
   */
  it('never claims resizing beats any codec choice as an unconditional fact', () => {
    expect(
      scan(/resiz\w+[^.]{0,60}\bbeats?\b[^.]{0,40}\b(?:any|every|all)\b[^.]{0,30}codec/i),
    ).toEqual([])
    expect(scan(/\bno codec (?:choice )?(?:recovers|beats|saves|matches)/i)).toEqual([])
    expect(scan(/resiz\w+[^.]{0,50}\bmore bytes than (?:any|every) (?:codec|format)/i)).toEqual([])
  })

  /*
   * B. True-half / false-whole loss claims. "Nothing is lost converting an
   * 8-bit JPEG" was true of BIT DEPTH and false of the transcode, which is
   * another lossy encode unless lossless is selected. A page-level "8-bit"
   * mention is not enough to redeem it — the sentence itself must be about
   * precision, not about the conversion as a whole.
   */
  it('scopes every no-loss claim to what is actually preserved', () => {
    // Bounded at CLAUSE boundaries, not sentence ones. A first version ran to
    // 80 characters and swept up the following clause, so
    // "Nothing is lost converting an 8-bit JPEG, but this is not a route to a
    // higher-precision master" redeemed itself on the word "precision" that
    // belonged to the disclaimer. The mutation test caught it.
    const LOSS =
      /\b(?:nothing is lost|no loss|loses nothing|without losing|does ?n[o']?t lose)\b[^.,;—]{0,60}/gi
    const offenders: string[] = []
    for (const { rel, surface } of pages) {
      for (const field of FIELDS) {
        const value = surface[field]
        if (typeof value !== 'string' || !value) continue
        for (const sentence of value.match(LOSS) ?? []) {
          // Redeemed only when the SAME sentence names what is preserved.
          const scoped =
            /bit[- ]depth|precision|dimension|pixel count|metadata|colour profile|color profile/i
          if (!scoped.test(sentence)) offenders.push(`${rel} [${field}]: "${sentence.trim()}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  /*
   * A quality value is a control on one encoder, not a unit. This is the same
   * class as the removed "an equivalent AVIF setting", checked here across the
   * head as well as the body.
   */
  it('implies no cross-codec quality equivalence anywhere', () => {
    expect(
      scan(/\b(?:JPEG|JPG|WebP|AVIF|HEIC)\s+quality\s+\d{1,3}[^.]{0,80}\bequivalent\b/i),
    ).toEqual([])
    expect(scan(/\bequivalent\s+(?:JPEG|JPG|WebP|AVIF|HEIC)\s+setting\b/i)).toEqual([])
  })

  /*
   * Unsourced size multiples, checked across the head too — a meta description
   * is exactly where a tempting round number ends up.
   */
  it('states no unsourced size multiple', () => {
    expect(scan(/\bmany times\b[^.]{0,40}\b(?:the size|larger|bigger)\b/i)).toEqual([])
  })
})

/**
 * `llms.txt` IS A PUBLIC FACTUAL SURFACE, and it sat outside every guard.
 *
 * The generic "TIFF is lossless" claim was removed from `formats.ts` and pinned
 * by a test scoped to that file — while `llms.txt` published "PNG and TIFF are
 * lossless" to every crawler that reads it. A guard bound to one surface is not
 * a guard on the claim.
 */
describe('llms.txt states the same facts as the pages', () => {
  let llms: string

  beforeAll(async () => {
    const { readFile } = await import('node:fs/promises')
    const path = await import('node:path')
    llms = await readFile(path.join(path.dirname(import.meta.dirname), 'dist', 'llms.txt'), 'utf8')
    expect(llms.length).toBeGreaterThan(500)
  })

  it('does not call TIFF lossless without saying what PixelFerry writes', () => {
    expect(llms).not.toMatch(/TIFF (?:are|is) lossless/i)
    expect(llms).toMatch(/LZW/)
  })

  it('records that every output is 8-bit', () => {
    expect(llms).toMatch(/8-bit/)
  })

  it('carries no unscoped ranking or unsourced multiple', () => {
    expect(llms).not.toMatch(/\b(?:the|usually the) (?:smallest|slowest|best)\b/i)
    expect(llms).not.toMatch(/\bmany times\b[^.]{0,30}\b(?:the size|larger)\b/i)
  })

  it('states HEIC and ICO asymmetrically', () => {
    expect(llms).toMatch(/HEIC \/ HEIF[^\n]*read anywhere; write on macOS/)
    expect(llms).toMatch(/ICO[^\n]*read on macOS; write anywhere/)
  })
})

/**
 * PRODUCT FACTS MUST BE DERIVED, NOT RESTATED.
 *
 * Twice now, a page has restated a `capabilities.*` string as an inline literal
 * instead of interpolating it — and both times a later correction to the
 * constant reached `llms.txt` and left the page publishing the old, false
 * version:
 *
 *   - the HEIC metadata caveat, which went on saying the metadata option "does
 *     not govern" HEIC output after the app started applying it;
 *   - the ICC rule, which went on saying the profile is "kept either way" after
 *     the constant was scoped to exclude PSD and PDF.
 *
 * Checking that the rendered page contains the constant verbatim makes the fork
 * fail loudly instead of drifting silently.
 */
describe('pages derive product facts from the model', () => {
  it('renders the metadata rule and its HEIC caveat from the constants', async () => {
    const { capabilities } = await import('../src/data/product')
    const pages = await loadPages()
    const home = pages.find((p: { rel: string }) => p.rel === 'index.html')!
    const text = (claimSurface(home) as unknown as Surface).visibleText

    expect(text, 'the homepage FAQ must interpolate capabilities.metadata').toContain(
      capabilities.metadata,
    )
    expect(text, 'the homepage FAQ must interpolate metadataHeicCaveat').toContain(
      capabilities.metadataHeicCaveat,
    )
  })

  it('never publishes the superseded unscoped ICC claim', async () => {
    const pages = await loadPages()
    for (const page of pages) {
      const s = claimSurface(page) as unknown as Surface
      // "kept either way" is only true where a profile survives the decoder.
      if (/kept either way/i.test(s.all)) {
        expect(s.all, `${page.rel} states the ICC rule without its exceptions`).toMatch(
          /exceptions at both ends/,
        )
      }
    }
  })
})

/**
 * Structural invariants for the facts that kept drifting. Narrow on purpose —
 * each one pins a defect that actually shipped, not a phrase someone dislikes.
 */
describe('structured product facts hold together', () => {
  it('the app preview totals cannot contradict its status counts', async () => {
    const { counts, totalFiles, summary, previewLabel } = await import('../src/data/queue')
    expect(counts.done + counts.converting + counts.ready + counts.failed).toBe(totalFiles)
    // The visible summary bar and the accessible label describe ONE batch.
    expect(summary.files).toBe(`${totalFiles} files`)
    expect(previewLabel).toContain(`queue of ${totalFiles} mixed image files`)
    expect(previewLabel).toContain(`${counts.done} done`)
    expect(previewLabel).toContain(`${counts.failed} failed`)
  })

  it('the rendered preview label matches the model', async () => {
    const { previewLabel } = await import('../src/data/queue')
    const pages = await loadPages()
    const home = pages.find((p: { rel: string }) => p.rel === 'index.html')!
    expect((claimSurface(home) as unknown as Surface).accessibleText).toContain(previewLabel)
  })

  it('describes the target-size floor as a floor, not as the lowest quality', async () => {
    const { targetSizeSearch } = await import('../src/data/product')
    expect(targetSizeSearch.qualityFloor).toBe(10)
    const pages = await loadPages()
    for (const page of pages) {
      const all = (claimSurface(page) as unknown as Surface).all
      // The app's quality control goes below 10; only the SEARCH stops there.
      expect(all, `${page.rel} calls the search floor the lowest quality`).not.toMatch(
        /lowest quality/i,
      )
    }
  })

  it('represents the ICO resize exception wherever the size rules are stated', async () => {
    const { formatExceptions } = await import('../src/data/product')
    const ico = formatExceptions.find((e) => e.format === 'ICO')!
    // Assert the CONTENT of the fact, not merely that the page echoes whatever
    // the constant happens to say — otherwise weakening the constant passes.
    expect(ico.note, 'the note must say the resize control does not reach ICO').toMatch(
      /does not apply|is ignored|do(?:es)? not reach/i,
    )
    const pages = await loadPages()
    const home = (
      claimSurface(
        pages.find((p: { rel: string }) => p.rel === 'index.html')!,
      ) as unknown as Surface
    ).all
    expect(home).toContain(ico.note)

    /*
     * AND no page may universally claim the size rules reach every file. This
     * test used to check only that the exception appeared SOMEWHERE, which let
     * a correct exception and a false universal coexist: the hero said "one set
     * of output rules applied to all of it — format, quality, dimensions,
     * destination" while the Size row below it named the ICO exception. The
     * reused WaitlistCta repeated the claim on every content page.
     */
    const UNIVERSAL =
      /(?:one set of )?output rules[^.]{0,60}(?:applied to all|to all of (?:it|them)|to every)|applies one set of output rules/i
    const offenders = pages
      .map((page: { rel: string }) => ({
        rel: page.rel,
        all: (claimSurface(page) as unknown as Surface).all,
      }))
      .filter(({ all }) => UNIVERSAL.test(all))
      .map(({ rel, all }) => `${rel}: "${all.match(UNIVERSAL)![0]}"`)
    expect(offenders, 'output rules stated as universal, contradicting the ICO exception').toEqual(
      [],
    )
  })

  it('states the PSD compatibility-composite requirement, not layer rendering', async () => {
    const { psdSupport } = await import('../src/data/product')
    expect(psdSupport.requiresCompatibilityComposite).toBe(true)
    const pages = await loadPages()
    const psdPages = pages.filter((p: { rel: string }) =>
      /formats\.html|psd-to-(png|jpg)\.html/.test(p.rel),
    )
    expect(psdPages.length).toBeGreaterThanOrEqual(3)
    for (const page of psdPages) {
      const all = (claimSurface(page) as unknown as Surface).all
      expect(all, `${page.rel} omits the compatibility-composite requirement`).toMatch(
        /Maximize Compatibility/i,
      )
      // It must never claim the layer stack is rendered.
      expect(all, `${page.rel} implies layer rendering`).not.toMatch(
        /renders? the layer stack(?! *,? *so| *\.? *It does not)/i,
      )
    }
  })

  it('keeps lossless CODEC separate from lossless CONVERSION', async () => {
    const { readFile } = await import('node:fs/promises')
    const path = await import('node:path')
    const llms = await readFile(
      path.join(path.dirname(import.meta.dirname), 'dist', 'llms.txt'),
      'utf8',
    )
    expect(llms).toMatch(/lossless CODECS, which is not the same as a lossless/i)
    // GIF must not be swept into that group — its loss is palette, not bit depth.
    expect(llms).toMatch(/GIF is not in that group/i)
    expect(llms).toMatch(/8-bit per channel/)
  })

  /*
   * The same distinction, on the RENDERED pages. Checking only llms.txt let the
   * homepage go on saying "PNG and TIFF are lossless" — ambiguous between a
   * lossless codec and a lossless conversion, and false of the conversion,
   * since the pipeline is 8-bit whatever the destination codec does.
   */
  it('never calls PNG and TIFF flatly lossless on a rendered page', async () => {
    const pages = await loadPages()
    const offenders = pages
      .map((page: { rel: string }) => ({
        rel: page.rel,
        all: (claimSurface(page) as unknown as Surface).all,
      }))
      .filter(({ all }) => /PNG and TIFF are lossless/i.test(all))
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })

  it('the homepage separates lossless compression from the 8-bit pipeline', async () => {
    const pages = await loadPages()
    const home = (
      claimSurface(
        pages.find((p: { rel: string }) => p.rel === 'index.html')!,
      ) as unknown as Surface
    ).all
    expect(home).toMatch(/lossless compression/i)
    expect(home).toMatch(/lossless LZW/i)
    // The half that makes the first half honest.
    expect(home).toMatch(/8-bit per channel/i)
  })

  it('calls a 3-5x measured range a range, not an order of magnitude', async () => {
    const pages = await loadPages()
    for (const page of pages) {
      const all = (claimSurface(page) as unknown as Surface).all
      expect(all, `${page.rel} calls a small measured ratio an order of magnitude`).not.toMatch(
        /order of magnitude/i,
      )
    }
  })
})
