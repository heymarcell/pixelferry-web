/**
 * The complete PixelFerry format capability model.
 *
 * Transcribed from the app's EXECUTABLE SOURCE, not its README — the two
 * disagree, and source wins (see `PRODUCT_FACTS_APP_COMMIT` in `product.ts`):
 *
 *   apps/desktop/src/shared/constants.ts   CROSS_PLATFORM_EXTENSIONS (17)
 *                                          MACOS_ONLY_EXTENSIONS     (59)
 *   apps/desktop/src/shared/settings.ts    VALID_FORMATS, OUTPUT_FORMAT_ORDER,
 *                                          QUALITY_FORMATS, FORMAT_CATALOG
 *   apps/desktop/src/main/main.ts          encodeHeicViaSips (macOS gate),
 *                                          encodeIcoOutput
 *   apps/desktop/src/main/pipeline.ts      applyFormat, encodeIco,
 *                                          buildHeicSipsArgs
 *
 * Every public list of formats on this site — `/formats`, the homepage, the FAQ,
 * `llms.txt`, the JSON-LD feature list — is DERIVED from this file. Nothing
 * restates it by hand, because the last hand-maintained list said HEIC was
 * input-only for a month while the app had been writing HEIC the whole time.
 *
 * Read and write are tracked SEPARATELY and per format, because they genuinely
 * differ:
 *
 *   ICO   read is macOS-only (ImageIO), write is cross-platform (png-to-ico)
 *   ICNS  read is macOS-only, and it is never written
 *   HEIC  read is cross-platform (sips, or a bundled JS decoder off macOS),
 *         write is macOS-only (sips)
 *
 * A single "input-only" list cannot express that, which is why there is not one.
 */

/** Where a capability is available. `false` means the app cannot do it at all. */
export type Availability = false | 'anywhere' | 'macos'

export type Format = {
  /** Stable id, used for anchors and lookups. */
  id: string
  /** Display label. */
  label: string
  /** Every accepted extension, lowercase, without the dot. */
  extensions: string[]
  /** Can PixelFerry read it, and where. */
  read: Availability
  /** Can PixelFerry write it, and where. */
  write: Availability
  /** True when writing it exposes a quality slider (QUALITY_FORMATS). */
  quality?: boolean
  /** Display grouping on /formats. */
  group: 'Photos and web' | 'Design and documents' | 'Camera RAW' | 'Specialist and legacy'
  summary: string
  /** Something a user would be annoyed to discover afterwards. */
  caveat?: string
}

export const formats: Format[] = [
  // ── Photos and web ────────────────────────────────────────────────────────
  {
    id: 'jpeg',
    label: 'JPEG',
    extensions: ['jpg', 'jpeg', 'jpe', 'jfif'],
    read: 'anywhere',
    write: 'anywhere',
    quality: true,
    group: 'Photos and web',
    summary: 'Widely supported lossy still-image format.',
    caveat: 'No alpha channel — transparency is flattened onto white on output.',
  },
  {
    id: 'png',
    label: 'PNG',
    extensions: ['png'],
    read: 'anywhere',
    write: 'anywhere',
    group: 'Photos and web',
    summary: 'Lossless, with an alpha channel. PixelFerry writes 8-bit PNG.',
  },
  {
    id: 'webp',
    label: 'WebP',
    extensions: ['webp'],
    read: 'anywhere',
    write: 'anywhere',
    quality: true,
    group: 'Photos and web',
    summary: 'Lossy or lossless, with alpha and animation. 8-bit only, by design.',
  },
  {
    id: 'avif',
    label: 'AVIF',
    extensions: ['avif'],
    read: 'anywhere',
    write: 'anywhere',
    quality: true,
    group: 'Photos and web',
    summary: 'AV1-based; lossy or lossless, with alpha. PixelFerry writes 8-bit AVIF.',
  },
  {
    id: 'heic',
    label: 'HEIC / HEIF',
    extensions: ['heic', 'heif', 'hif'],
    read: 'anywhere',
    write: 'macos',
    quality: true,
    group: 'Photos and web',
    summary: "Apple's HEIF profile — what an iPhone saves in High Efficiency mode.",
    caveat:
      'Reading works anywhere; writing is macOS-only, because the encode goes through the system `sips` tool.',
  },
  {
    id: 'tiff',
    label: 'TIFF',
    extensions: ['tiff', 'tif'],
    read: 'anywhere',
    write: 'anywhere',
    group: 'Photos and web',
    summary: 'Flexible raster container used in print and imaging workflows.',
    caveat:
      'The container can hold JPEG-compressed data and so is not lossless by definition. PixelFerry writes 8-bit LZW-compressed TIFF, which is.',
  },
  {
    id: 'gif',
    label: 'GIF',
    extensions: ['gif'],
    read: 'anywhere',
    write: 'anywhere',
    group: 'Photos and web',
    summary: 'A 256-colour palette, with animation.',
  },

  // ── Design and documents ──────────────────────────────────────────────────
  {
    id: 'svg',
    label: 'SVG',
    extensions: ['svg'],
    read: 'anywhere',
    write: false,
    group: 'Design and documents',
    summary: 'Vector artwork, rasterised on conversion.',
    caveat: 'Read only — output is always a raster image.',
  },
  {
    id: 'psd',
    label: 'PSD / PSB',
    extensions: ['psd', 'psb'],
    read: 'anywhere',
    write: false,
    group: 'Design and documents',
    summary: 'Photoshop documents, read via the stored composite.',
    caveat:
      'Read only. The bundled decoder reads 8-bit composites and does not consult the document colour mode, so 16-bit fails and CMYK is misread rather than converted. No embedded ICC profile is carried through.',
  },
  {
    id: 'pdf',
    label: 'PDF',
    extensions: ['pdf'],
    read: 'anywhere',
    write: false,
    group: 'Design and documents',
    summary: 'Rendered to one image per page.',
    caveat: 'Read only, and capped at the first 100 pages.',
  },

  // ── Camera RAW ────────────────────────────────────────────────────────────
  {
    id: 'raw',
    label: 'Camera RAW',
    extensions: [
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
    ],
    read: 'macos',
    write: false,
    group: 'Camera RAW',
    summary:
      'Adobe DNG plus Canon, Nikon, Sony, Fujifilm, Olympus, Panasonic, Pentax, Samsung, Leica, Hasselblad, Phase One and more.',
    caveat: 'Read only, and demosaiced by macOS ImageIO.',
  },

  // ── Specialist and legacy ─────────────────────────────────────────────────
  {
    id: 'exr-hdr',
    label: 'OpenEXR / Radiance HDR',
    extensions: ['exr', 'hdr', 'pic'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'High dynamic range, tone-mapped to a displayable range on conversion.',
    caveat: 'Read only.',
  },
  {
    id: 'bmp-tga',
    label: 'BMP / TGA / SGI',
    extensions: ['bmp', 'dib', 'tga', 'sgi'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary:
      'Legacy raster formats, usually stored uncompressed though both define run-length variants.',
    caveat: 'Read only.',
  },
  {
    id: 'ico',
    label: 'ICO',
    extensions: ['ico'],
    read: 'macos',
    write: 'anywhere',
    group: 'Specialist and legacy',
    summary: 'Windows icon bundles — one file holding several square sizes.',
    caveat:
      'The one format whose read and write differ in the opposite direction: reading needs macOS, writing works anywhere.',
  },
  {
    id: 'icns-cur',
    label: 'ICNS / CUR',
    extensions: ['icns', 'cur'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'macOS icon bundles and Windows cursors.',
    caveat: 'Read only. PixelFerry writes ICO, but never ICNS.',
  },
  {
    id: 'gpu-textures',
    label: 'GPU textures',
    extensions: ['dds', 'pvr', 'astc', 'ktx', 'ktx2'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'Compressed texture containers used by game and graphics pipelines.',
    caveat: 'Read only.',
  },
  {
    id: 'jxl',
    label: 'JPEG XL',
    extensions: ['jxl'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'A newer still-image codec from the JPEG committee.',
    caveat: 'Read only.',
  },
  {
    id: 'jp2',
    label: 'JPEG 2000',
    extensions: ['jp2', 'jpf', 'jpx', 'j2k', 'j2c'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'A wavelet-based JPEG committee format, used in archival and cinema work.',
    caveat: 'Read only.',
  },
  {
    id: 'netpbm',
    label: 'NetPBM',
    extensions: ['pbm', 'pgm', 'ppm', 'pfm'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary:
      'Simple raster formats from the Unix imaging world, in ASCII and binary variants, plus the float-valued PFM.',
    caveat: 'Read only.',
  },
  {
    id: 'dicom',
    label: 'DICOM',
    extensions: ['dcm', 'dicom'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'Medical imaging.',
    caveat: 'Read only.',
  },
  {
    id: 'pict',
    label: 'PICT',
    extensions: ['pict', 'pct'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'Classic Mac OS picture format.',
    caveat: 'Read only.',
  },
  {
    id: 'mpo',
    label: 'MPO',
    extensions: ['mpo'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'Multi-picture JPEG, used for stereo pairs.',
    caveat: 'Read only, and only one view is converted.',
  },
  {
    id: 'avci-heics',
    label: 'AVCI / HEICS',
    extensions: ['avci', 'heics'],
    read: 'macos',
    write: false,
    group: 'Specialist and legacy',
    summary: 'H.264-in-HEIF stills, and HEIF image sequences.',
    caveat: 'Read only.',
  },
]

// ── Derived views ───────────────────────────────────────────────────────────
//
// Everything below is computed. Nothing here is a second hand-written list.

export const readableFormats = formats.filter((f) => f.read !== false)
export const writableFormats = formats.filter((f) => f.write !== false)

/** Read but never written — derived, not asserted. */
export const readOnlyFormats = formats.filter((f) => f.read !== false && f.write === false)

/** Readable only on macOS. */
export const macOSOnlyReadFormats = formats.filter((f) => f.read === 'macos')

/** Writable only on macOS. Today: HEIC alone. */
export const macOSOnlyWriteFormats = formats.filter((f) => f.write === 'macos')

/** Output formats that expose a quality slider. */
export const qualityFormats = formats.filter((f) => f.write !== false && f.quality)

/** Every accepted extension, deduped and sorted — the completeness check. */
export const allInputExtensions = [...new Set(readableFormats.flatMap((f) => f.extensions))].sort()

/**
 * The order the app offers outputs in — `OUTPUT_FORMAT_ORDER` in the app's
 * `shared/settings.ts`. These are the APP's format keys, not this file's ids:
 * the app says `jpg`, the model says `jpeg`.
 */
export const OUTPUT_ORDER = ['jpg', 'png', 'webp', 'heic', 'avif', 'tiff', 'gif', 'ico'] as const

/** App output key -> model id. Only JPEG differs. */
const OUTPUT_KEY_TO_ID: Record<string, string> = { jpg: 'jpeg' }

/**
 * Every writable format IN THE APP'S OWN PICKER ORDER.
 *
 * `writableFormats` follows this file's grouping order, which puts AVIF BEFORE
 * HEIC. Anything describing "the formats the app writes" that derived from it
 * therefore published an order the app does not use, under a comment claiming
 * it did. Set-equality tests could never catch that, because the set is right.
 *
 * Every public surface mirroring the app's output picker must use THIS.
 *
 * The mapping is validated here rather than asserted in a test: if OUTPUT_ORDER
 * and the model ever disagree, the build fails instead of shipping a silently
 * short or misordered list.
 */
export const outputFormats: Format[] = OUTPUT_ORDER.map((key) => {
  const id = OUTPUT_KEY_TO_ID[key] ?? key
  const format = formats.find((f) => f.id === id)
  if (!format) throw new Error(`OUTPUT_ORDER names "${key}" but no format has id "${id}"`)
  if (format.write === false) throw new Error(`OUTPUT_ORDER names "${key}" but it is not writable`)
  return format
})

/** Output labels in the app's picker order. */
export const outputFormatLabels = outputFormats.map((f) => f.label)

export const groups: Format['group'][] = [
  'Photos and web',
  'Design and documents',
  'Camera RAW',
  'Specialist and legacy',
]

const readPhrase = (a: Availability) =>
  a === 'anywhere' ? 'read anywhere' : a === 'macos' ? 'read on macOS' : null

const writePhrase = (a: Availability) =>
  a === 'anywhere' ? 'write anywhere' : a === 'macos' ? 'write on macOS' : null

/**
 * One-line capability phrase, used by /formats and llms.txt.
 *
 * SYMMETRIC BY CONSTRUCTION. The previous version rendered each side as a bare
 * verb and joined them with "and", so HEIC — which reads anywhere and writes
 * only on macOS — came out as "read and write on macOS". The macOS scope leaked
 * backwards onto the read verb and stated the opposite of the truth on the one
 * format whose asymmetry matters most. ICO, asymmetric the other way, produced
 * the equally loose "read on macOS and write".
 *
 * Each side now carries its own scope and neither can inherit the other's, so
 * the bug is not merely fixed, it is unexpressible.
 */
export function capabilityOf(format: Format): string {
  const read = readPhrase(format.read)
  const write = writePhrase(format.write)
  if (read && write) return `${read}; ${write}`
  if (read) return `${read} only`
  if (write) return `${write} only`
  return 'unsupported'
}
