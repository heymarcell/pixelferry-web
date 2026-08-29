import { describe, expect, it } from 'vitest'
import {
  formats,
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
  it.each([
    ['jpeg', 'read and write'],
    ['heic', 'read and write on macOS'],
    ['ico', 'read on macOS and write'],
    ['svg', 'read only'],
    ['raw', 'read on macOS only'],
  ])('describes %s as "%s"', (id, expected) => {
    expect(capabilityOf(formats.find((f) => f.id === id)!)).toBe(expected)
  })
})
