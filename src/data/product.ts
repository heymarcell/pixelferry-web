/**
 * The website's single source of truth for what PixelFerry actually is.
 *
 * Every product claim on this site reads from here, so a fact can only be
 * wrong in ONE place. The values are transcribed from the private product
 * repo `heymarcell/pixelferry-app` — `README.md` §1/§2/§7 and `CLAUDE.md` —
 * which is the authority. When the app changes, change this file, not the
 * pages.
 *
 * `npm test` guards the facts that have already drifted once (see
 * `test/product-claims.test.ts`): the minimum macOS version, and the word
 * "native" used as a technical claim rather than as "native-feeling".
 */

/** Bump when re-synced against pixelferry-app so drift is auditable. */
export const PRODUCT_FACTS_SYNCED = '2026-08-29'

export const product = {
  name: 'PixelFerry',
  /** One line, no marketing adjectives — used in metadata and JSON-LD. */
  tagline: 'Mixed formats. One clean batch.',

  platform: 'macOS',
  /**
   * macOS 14 (Sonoma). The site said "macOS 13+" in four places while the app
   * had always required 14 — the drift this file exists to prevent.
   */
  minimumOS: {
    version: '14',
    name: 'Sonoma',
    label: 'macOS 14 (Sonoma) or later',
    short: 'macOS 14+',
  },
  architectures: 'Apple silicon and Intel',

  /**
   * Electron + React + Sharp. It feels native and uses macOS system codecs,
   * but it is NOT a Cocoa application — so the site says "native-feeling",
   * never "native". Marketing it as native would be a false technical claim.
   */
  implementation: {
    runtime: 'Electron',
    imagePipeline: 'Sharp (libvips)',
    macOSCodecs: 'sips / ImageIO',
    honestDescriptor: 'native-feeling',
  },

  releaseState: {
    stage: 'private beta',
    label: 'Private Mac beta · opening soon',
    /** No public download and no price exists yet — see docs/seo.md. */
    publiclyDownloadable: false,
  },

  /** Conversion is local. The app never uploads files, clipboard or metadata. */
  privacy: {
    localOnly: true,
    claim: 'Images are converted on your Mac. Nothing is uploaded.',
    originalsUntouched: true,
  },

  /** Files handed to the engine at once (apps/desktop main process). */
  concurrency: 4,
} as const

// ─── Formats ────────────────────────────────────────────────────────────────

export type FormatSupport = {
  /** Uppercase display label, e.g. 'HEIC'. */
  label: string
  /** Lowercase extensions the app accepts, without the dot. */
  extensions: string[]
  /** Short, factual description of the format. */
  summary: string
  /** True when macOS ImageIO does the decoding (so it is macOS-only). */
  macOSOnly?: boolean
  /** Anything a user would be annoyed to discover after the fact. */
  caveat?: string
}

/** Formats the app can read. Source: pixelferry-app README §2. */
export const inputFormats: FormatSupport[] = [
  {
    label: 'JPEG',
    extensions: ['jpg', 'jpeg'],
    summary: 'The universal lossy photo format.',
  },
  {
    label: 'PNG',
    extensions: ['png'],
    summary: 'Lossless, with an alpha channel.',
  },
  {
    label: 'WebP',
    extensions: ['webp'],
    summary: 'Lossy or lossless, with alpha and animation.',
  },
  {
    label: 'AVIF',
    extensions: ['avif'],
    summary: 'AV1-based, the smallest of the modern web formats.',
  },
  {
    label: 'HEIC / HEIF',
    extensions: ['heic', 'heif', 'hif'],
    summary: 'What an iPhone saves photos as by default.',
    caveat: 'Input only — PixelFerry reads HEIC but does not write it.',
  },
  {
    label: 'TIFF',
    extensions: ['tiff', 'tif'],
    summary: 'Lossless, the print and archive workhorse.',
  },
  {
    label: 'GIF',
    extensions: ['gif'],
    summary: 'A 256-colour palette, with animation.',
  },
  {
    label: 'SVG',
    extensions: ['svg'],
    summary: 'Vector artwork, rasterised on conversion.',
    caveat: 'Input only — output is always a raster image.',
  },
  {
    label: 'PSD / PSB',
    extensions: ['psd', 'psb'],
    summary: 'Photoshop documents.',
    caveat: 'Flattened to their composite before conversion. Input only.',
  },
  {
    label: 'PDF',
    extensions: ['pdf'],
    summary: 'Rendered to one image per page.',
    caveat: 'Input only, and capped at the first 100 pages.',
  },
  {
    label: 'Camera RAW',
    extensions: ['dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2'],
    summary: 'Canon, Nikon, Sony, Fujifilm, Olympus, Panasonic, Adobe DNG and more.',
    macOSOnly: true,
    caveat: 'Demosaiced by macOS ImageIO. Input only.',
  },
  {
    label: 'EXR / HDR',
    extensions: ['exr', 'hdr'],
    summary: 'High dynamic range, tone-mapped to a displayable range on conversion.',
    macOSOnly: true,
  },
  {
    label: 'BMP / TGA',
    extensions: ['bmp', 'tga'],
    summary: 'Legacy uncompressed raster formats.',
    macOSOnly: true,
  },
  {
    label: 'ICO / ICNS',
    extensions: ['ico', 'icns'],
    summary: 'Windows and macOS icon containers.',
    macOSOnly: true,
  },
  {
    label: 'JPEG XL / JPEG 2000',
    extensions: ['jxl', 'jp2'],
    summary: 'Newer and older JPEG successors.',
    macOSOnly: true,
  },
]

/** Formats the app can write. Source: pixelferry-app README §2. */
export const outputFormats: FormatSupport[] = [
  { label: 'PNG', extensions: ['png'], summary: 'Lossless, keeps transparency.' },
  { label: 'JPG', extensions: ['jpg'], summary: 'Lossy, quality 1–100, optional progressive.' },
  { label: 'WebP', extensions: ['webp'], summary: 'Lossy or lossless, keeps transparency.' },
  { label: 'AVIF', extensions: ['avif'], summary: 'Lossy or lossless, the smallest files.' },
  { label: 'TIFF', extensions: ['tiff'], summary: 'Lossless LZW.' },
  { label: 'GIF', extensions: ['gif'], summary: 'A 256-colour palette.' },
  { label: 'ICO', extensions: ['ico'], summary: 'Windows icon bundles.' },
]

/** Read but never written. Stated plainly so nobody expects a round trip. */
export const inputOnlyFormats = ['HEIC', 'PSD', 'PDF', 'SVG', 'camera RAW'] as const

export const outputFormatLabels = outputFormats.map((f) => f.label)

/** Hard, quotable product limits. Each one is checked against the app repo. */
export const limits = {
  pdfPageCap: 100,
  quality: { min: 1, max: 100 },
  dimensions: { min: 1, max: 30720 },
  scalePercent: { min: 1, max: 1000 },
} as const

/** What the app does to an image, in pipeline order (README §7). */
export const capabilities = {
  autoOrient: 'EXIF orientation is applied, so output matches the thumbnail.',
  trim: 'Optional whitespace trim, keyed off the top-left pixel.',
  resizeModes: ['width only', 'height only', 'exact width × height', 'percentage'] as const,
  fitModes: ['crop', 'fit', 'fill'] as const,
  animation:
    'Animated GIF and WebP keep every frame when the target also supports animation; otherwise the first frame is written and the row says so.',
  jpegTransparency: 'JPEG has no alpha channel, so transparency is flattened onto white.',
  neverOverwrites:
    'Output never replaces the source or an existing file — a colliding name gets a `_converted` suffix.',
  /**
   * The "remove metadata" option drops EXIF, XMP and IPTC — camera model,
   * authoring history and GPS coordinates — but deliberately KEEPS the ICC
   * colour profile (`keepIccProfile()`), because bundling the two would mean
   * that asking to remove your location silently reinterpreted your colours.
   */
  metadata:
    'Removing metadata strips EXIF, XMP and IPTC but keeps the ICC colour profile, so a Display P3 image stays Display P3.',
  targetSize: 'A target file size re-encodes at successive quality values until the output fits.',
} as const

/**
 * Where the marketing site links for the product itself. There is no public
 * download yet, so every CTA is the waitlist.
 */
export const productLinks = {
  waitlistAnchor: '/#waitlist',
  contactEmail: 'hello@pixelferry.app',
  privacyEmail: 'privacy@pixelferry.app',
  betaEmail: 'beta@pixelferry.app',
} as const
