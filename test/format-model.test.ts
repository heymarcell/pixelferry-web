import { describe, expect, it } from 'vitest'
import {
  type Availability,
  type Format,
  formats,
  outputFormats,
  outputFormatLabels,
  readableFormats,
  writableFormats,
  readOnlyFormats,
  macOSOnlyWriteFormats,
  allInputExtensions,
  qualityFormats,
  capabilityOf,
} from '../src/data/formats'
import { PRODUCT_FACTS_APP_COMMIT } from '../src/data/product'

/**
 * The website's format model, pinned against a SNAPSHOT of the app's source.
 *
 * ── What these tests do and do not prove ──────────────────────────────────
 *
 * They prove the site agrees with the snapshot recorded below, taken from
 * `heymarcell/pixelferry-app` at `PRODUCT_FACTS_APP_COMMIT`. They do NOT
 * dynamically prove parity with app `main`: public CI must never clone the
 * private repo, so nothing here can notice that the app changed. Re-syncing is
 * a manual step (see CLAUDE.md), and bumping the commit without re-copying
 * these arrays would defeat the point.
 *
 * The snapshot is transcribed from EXECUTABLE SOURCE, not from the README —
 * the README at this commit still calls HEIC input-only, and it is wrong.
 */

/** apps/desktop/src/shared/constants.ts — CROSS_PLATFORM_EXTENSIONS */
const APP_CROSS_PLATFORM = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'png',
  'webp',
  'avif',
  'tiff',
  'tif',
  'gif',
  'svg',
  'heic',
  'heif',
  'hif',
  'psd',
  'psb',
  'pdf',
]

/** apps/desktop/src/shared/constants.ts — MACOS_ONLY_EXTENSIONS */
const APP_MACOS_ONLY = [
  'exr',
  'hdr',
  'pic',
  'bmp',
  'dib',
  'tga',
  'ico',
  'icns',
  'cur',
  'sgi',
  'dds',
  'pvr',
  'astc',
  'ktx',
  'ktx2',
  'pict',
  'pct',
  'jxl',
  'jp2',
  'jpf',
  'jpx',
  'j2k',
  'j2c',
  'pbm',
  'pgm',
  'ppm',
  'pfm',
  'dcm',
  'dicom',
  'mpo',
  'avci',
  'heics',
  'dng',
  'cr2',
  'cr3',
  'crw',
  'nef',
  'nrw',
  'nefx',
  'arw',
  'srf',
  'sr2',
  'axr',
  'raf',
  'orf',
  'ori',
  'rw2',
  'pef',
  'srw',
  'dcr',
  'erf',
  '3fr',
  'fff',
  'iiq',
  'mrw',
  'raw',
  'rwl',
  'mos',
  'dxo',
]

/** apps/desktop/src/shared/settings.ts — VALID_FORMATS / OUTPUT_FORMAT_ORDER */
const APP_OUTPUT_FORMATS = ['png', 'jpg', 'webp', 'heic', 'avif', 'tiff', 'gif', 'ico']

/** apps/desktop/src/shared/settings.ts — QUALITY_FORMATS */
const APP_QUALITY_FORMATS = ['jpg', 'jpeg', 'webp', 'avif', 'heic']

describe('the snapshot is pinned to a commit', () => {
  it('records the exact app revision, not just a date', () => {
    expect(PRODUCT_FACTS_APP_COMMIT).toMatch(/^[0-9a-f]{40}$/)
  })
})

describe('input coverage is complete', () => {
  it('covers every extension the app accepts', () => {
    const expected = [...new Set([...APP_CROSS_PLATFORM, ...APP_MACOS_ONLY])].sort()
    const missing = expected.filter((ext) => !allInputExtensions.includes(ext))
    expect(missing, 'extensions the app reads but the site does not list').toEqual([])
  })

  it('claims no extension the app does not accept', () => {
    const accepted = new Set([...APP_CROSS_PLATFORM, ...APP_MACOS_ONLY])
    const invented = allInputExtensions.filter((ext) => !accepted.has(ext))
    expect(invented, 'extensions the site claims but the app does not accept').toEqual([])
  })

  it('marks cross-platform reads as readable anywhere', () => {
    for (const ext of APP_CROSS_PLATFORM) {
      const format = formats.find((f) => f.extensions.includes(ext))
      expect(format, `no model entry for .${ext}`).toBeDefined()
      expect(format!.read, `.${ext} should read anywhere`).toBe('anywhere')
    }
  })

  it('marks macOS-only reads as macOS-only', () => {
    for (const ext of APP_MACOS_ONLY) {
      const format = formats.find((f) => f.extensions.includes(ext))
      expect(format, `no model entry for .${ext}`).toBeDefined()
      expect(format!.read, `.${ext} should read on macOS only`).toBe('macos')
    }
  })
})

describe('output capability matches the app', () => {
  /*
   * The invariant this file replaces asserted that HEIC could never be an
   * output. That was false for the whole life of this branch: the app lists
   * `heic` in VALID_FORMATS, OUTPUT_FORMAT_ORDER and QUALITY_FORMATS, and
   * `main.ts` dispatches `format === 'heic'` to `encodeHeicViaSips`.
   */
  it('writes HEIC', () => {
    const heic = formats.find((f) => f.id === 'heic')
    expect(heic?.write, 'HEIC output is real — see encodeHeicViaSips').not.toBe(false)
  })

  it('writes HEIC on macOS only', () => {
    // main.ts: `if (process.platform !== 'darwin') throw new Error('HEIC output
    // is only available on macOS.')`
    const heic = formats.find((f) => f.id === 'heic')
    expect(heic?.write).toBe('macos')
    expect(macOSOnlyWriteFormats.map((f) => f.id)).toEqual(['heic'])
  })

  it('reads HEIC anywhere, even though it writes it only on macOS', () => {
    // A bundled JS decoder covers HEIC input off macOS; only the ENCODE is
    // sips-bound. Collapsing the two is how the old model went wrong.
    const heic = formats.find((f) => f.id === 'heic')
    expect(heic?.read).toBe('anywhere')
  })

  it('writes exactly the app output set, and nothing else', () => {
    // Map the site's format ids onto the app's format keys.
    const siteWritable = new Set(
      writableFormats.flatMap((f) => (f.id === 'jpeg' ? ['jpg'] : [f.id])),
    )
    expect([...siteWritable].sort()).toEqual([...APP_OUTPUT_FORMATS].sort())
  })

  it('offers a quality slider on exactly the app quality formats', () => {
    const siteQuality = new Set(
      qualityFormats.flatMap((f) => (f.id === 'jpeg' ? ['jpg', 'jpeg'] : [f.id])),
    )
    expect([...siteQuality].sort()).toEqual([...APP_QUALITY_FORMATS].sort())
  })

  it('writes ICO anywhere even though it reads ICO only on macOS', () => {
    // The case a single "input-only" list cannot express: ICO output goes
    // through png-to-ico (cross-platform), while ICO input needs ImageIO.
    const ico = formats.find((f) => f.id === 'ico')
    expect(ico?.read).toBe('macos')
    expect(ico?.write).toBe('anywhere')
  })

  it('never writes ICNS', () => {
    const icns = formats.find((f) => f.id === 'icns-cur')
    expect(icns?.write).toBe(false)
    // ...and it is therefore not lumped in with ICO.
    expect(icns?.extensions).not.toContain('ico')
  })
})

describe('read-only status is derived, not asserted', () => {
  it('lists only formats that are genuinely never written', () => {
    for (const format of readOnlyFormats) {
      expect(format.write, `${format.label} is in readOnlyFormats but is writable`).toBe(false)
      expect(format.read, `${format.label} is in readOnlyFormats but is not readable`).not.toBe(
        false,
      )
    }
  })

  it('does not contain HEIC', () => {
    expect(readOnlyFormats.map((f) => f.id)).not.toContain('heic')
  })

  it('does not contain ICO', () => {
    expect(readOnlyFormats.map((f) => f.id)).not.toContain('ico')
  })

  it('accounts for every readable format exactly once', () => {
    expect(readOnlyFormats.length + readableFormats.filter((f) => f.write !== false).length).toBe(
      readableFormats.length,
    )
  })
})

describe('capability phrasing', () => {
  /*
   * These assertions previously ENFORCED the bug. `capabilityOf` rendered each
   * side as a bare verb and joined them with "and", so HEIC came out as
   * "read and write on macOS" — and the test asserted exactly that string, as
   * did test/format-surfaces.test.ts against the generated llms.txt.
   *
   * HEIC reads ANYWHERE. The published phrase said the opposite of the truth on
   * the one format whose asymmetry the whole model exists to express, and three
   * green tests held it in place.
   */
  it.each([
    ['jpeg', 'read anywhere; write anywhere'],
    ['heic', 'read anywhere; write on macOS'],
    ['ico', 'read on macOS; write anywhere'],
    ['svg', 'read anywhere only'],
    ['raw', 'read on macOS only'],
  ])('describes %s as "%s"', (id, expected) => {
    expect(capabilityOf(formats.find((f) => f.id === id)!)).toBe(expected)
  })

  it("never lets one side inherit the other side's platform scope", () => {
    for (const format of formats) {
      const phrase = capabilityOf(format)
      if (format.read === 'anywhere' && format.write === 'macos') {
        expect(phrase, `${format.label} must not imply macOS-only reading`).toContain(
          'read anywhere',
        )
      }
      if (format.read === 'macos' && format.write === 'anywhere') {
        expect(phrase, `${format.label} must not imply macOS-only writing`).toContain(
          'write anywhere',
        )
      }
      // The old ambiguous shapes, forbidden outright.
      expect(phrase).not.toMatch(/^read and write/)
      expect(phrase).not.toMatch(/read on macOS and write$/)
    }
  })

  /*
   * Synthetic records, so a format added later with an availability combination
   * nothing currently has cannot reintroduce an ambiguous phrase.
   */
  it.each([
    ['anywhere', 'anywhere', 'read anywhere; write anywhere'],
    ['anywhere', 'macos', 'read anywhere; write on macOS'],
    ['macos', 'anywhere', 'read on macOS; write anywhere'],
    ['macos', 'macos', 'read on macOS; write on macOS'],
    ['anywhere', false, 'read anywhere only'],
    ['macos', false, 'read on macOS only'],
    [false, 'anywhere', 'write anywhere only'],
    [false, 'macos', 'write on macOS only'],
    [false, false, 'unsupported'],
  ] as [Availability, Availability, string][])(
    'read=%s write=%s -> "%s"',
    (read, write, expected) => {
      const synthetic: Format = {
        id: 'synthetic',
        label: 'Synthetic',
        extensions: ['syn'],
        read,
        write,
        group: 'Specialist and legacy',
        summary: 'A record that exists only to pin the phrasing matrix.',
      }
      expect(capabilityOf(synthetic)).toBe(expected)
    },
  )
})

describe('canonical output order', () => {
  /*
   * `writableFormats` follows this file's GROUPING order, which puts AVIF before
   * HEIC. Every public "what it writes" list derived from it, under a comment
   * claiming it was the app's order. Set-equality tests passed throughout,
   * because the set was never wrong — only the sequence was.
   */
  it('matches the app OUTPUT_FORMAT_ORDER exactly, as a sequence', () => {
    expect(outputFormats.map((f) => f.id)).toEqual([
      'jpeg',
      'png',
      'webp',
      'heic',
      'avif',
      'tiff',
      'gif',
      'ico',
    ])
  })

  it('is a different order from writableFormats — which is why this test exists', () => {
    expect(outputFormats.map((f) => f.id)).not.toEqual(writableFormats.map((f) => f.id))
  })

  it('covers every writable format exactly once', () => {
    expect(outputFormats).toHaveLength(writableFormats.length)
    expect(new Set(outputFormats.map((f) => f.id)).size).toBe(outputFormats.length)
  })

  it('labels follow the same sequence', () => {
    expect(outputFormatLabels).toEqual(outputFormats.map((f) => f.label))
    expect(outputFormatLabels[3]).toBe('HEIC / HEIF')
    expect(outputFormatLabels[4]).toBe('AVIF')
  })
})

describe('the format model states capabilities, not folklore', () => {
  /*
   * The model itself carried the same editorial superlatives this project spent
   * three passes removing from the prose — "the universal lossy photo format",
   * "usually the smallest of the modern web formats", "the print and archive
   * workhorse". They render on /formats and in llms.txt, so they are published
   * claims. The app removed the identical class of wording from its own format
   * blurbs, for the same reason: a ranking the software cannot know.
   */
  const FOLKLORE =
    /\b(?:universal|the smallest|best|workhorse|archival format|successor|industry standard|gold standard)\b/i

  it.each(formats.map((f) => [f.label, f] as const))('%s says what it is', (label, format) => {
    expect(format.summary, `${label} summary reads as a ranking`).not.toMatch(FOLKLORE)
    if (format.caveat) {
      expect(format.caveat, `${label} caveat reads as a ranking`).not.toMatch(FOLKLORE)
    }
  })

  it('never calls TIFF lossless without saying what PixelFerry writes', () => {
    const tiff = formats.find((f) => f.id === 'tiff')!
    // A container is not a compression scheme — TIFF can hold JPEG data.
    expect(tiff.summary).not.toMatch(/\blossless\b/i)
    expect(tiff.caveat).toMatch(/LZW/)
    expect(tiff.caveat).toMatch(/8-bit/)
  })

  it('scopes bit depth on the formats PixelFerry writes 8-bit', () => {
    for (const id of ['png', 'avif']) {
      expect(formats.find((f) => f.id === id)!.summary).toMatch(/8-bit/)
    }
  })

  it('states the PSD decoder limits rather than implying fidelity', () => {
    const psd = formats.find((f) => f.id === 'psd')!
    expect(psd.caveat).toMatch(/8-bit/)
    expect(psd.caveat).toMatch(/CMYK/)
    expect(psd.caveat).toMatch(/ICC/)
  })
})

describe('the product model describes the real trim', () => {
  it('does not claim the border colour comes from the top-left pixel alone', async () => {
    const { readFile } = await import('node:fs/promises')
    const path = await import('node:path')
    const src = await readFile(
      path.join(path.dirname(import.meta.dirname), 'src', 'data', 'product.ts'),
      'utf8',
    )
    // detectBorderColor samples all four corners and takes the dominant one.
    const trimLine = src.split('\n').find((l) => l.trimStart().startsWith('trim:'))!
    expect(trimLine).not.toMatch(/top[- ]left/i)
    expect(trimLine).toMatch(/dominant corner/i)
  })
})
