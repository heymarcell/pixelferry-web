/**
 * The website's single source of truth for what PixelFerry actually is.
 *
 * Every product claim on this site reads from here (and from `formats.ts`), so
 * a fact can only be wrong in ONE place.
 *
 * ── Source-of-truth order ──────────────────────────────────────────────────
 *
 * Values are transcribed from the private product repo
 * `heymarcell/pixelferry-app`, reconciled in this order:
 *
 *   1. executable source
 *   2. tests exercising that source
 *   3. typed shared configuration used by the UI and pipeline
 *   4. only then README / docs
 *
 * When source and README disagree, SOURCE AND TESTS WIN. That is not
 * theoretical: at the pinned commit below the app README §2 still says
 * "SVG, HEIC, PSD, PDF, RAW are input-only", while `shared/settings.ts` lists
 * `heic` in VALID_FORMATS, OUTPUT_FORMAT_ORDER and QUALITY_FORMATS,
 * `main.ts` dispatches `format === 'heic'` to `encodeHeicViaSips`, and
 * `pipeline.test.ts` tests `buildHeicSipsArgs`. HEIC output is real; the
 * README is stale, and this site follows the source.
 *
 * `npm test` guards the facts that have already drifted (see
 * `test/product-claims.test.ts`).
 */

/** Date of the last manual reconciliation against the app repo. */
export const PRODUCT_FACTS_SYNCED = '2026-08-29'

/**
 * The EXACT `pixelferry-app` revision these capabilities were verified against.
 *
 * A date is too weak for a cross-repository truth snapshot — it says when
 * someone looked, not what they looked at. This says what they looked at.
 *
 * It is an audit marker for humans and agents, not a runtime dependency: public
 * CI must never clone the private repo. The tests in this repo prove the
 * website agrees with THIS SNAPSHOT, not that it will agree with app `main`
 * tomorrow. Re-verify and bump both when syncing.
 */
export const PRODUCT_FACTS_APP_COMMIT = '3309d0b5c89b29abeb458a39e37c554ad5364011'

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
//
// The format capability model lives in `formats.ts` and is re-exported here so
// existing imports keep working. It tracks read and write SEPARATELY and per
// format, because they genuinely differ — ICO is read only on macOS but written
// anywhere, HEIC is read anywhere but written only on macOS.
//
// There is deliberately no hand-written `inputOnlyFormats` array any more. The
// last one listed five entries, called HEIC input-only (wrong), and could not
// express a group like ICO/ICNS where one member is writable and the other is
// not. `readOnlyFormats` is derived instead.

export {
  type Availability,
  type Format,
  formats,
  readableFormats,
  writableFormats,
  readOnlyFormats,
  macOSOnlyReadFormats,
  macOSOnlyWriteFormats,
  qualityFormats,
  allInputExtensions,
  allOutputLabels,
  OUTPUT_ORDER,
  groups,
  capabilityOf,
} from './formats'

import {
  readableFormats as _readable,
  writableFormats as _writable,
  readOnlyFormats as _readOnly,
} from './formats'

/** Output format labels, in the order the app offers them. */
export const outputFormatLabels = _writable.map((f) => f.label)

/** Read-but-never-written format labels. Derived — never asserted by hand. */
export const readOnlyFormatLabels = _readOnly.map((f) => f.label)

/** Counts used in prose, so a sentence cannot drift from the model. */
export const formatCounts = {
  readable: _readable.length,
  writable: _writable.length,
  extensions: new Set(_readable.flatMap((f) => f.extensions)).size,
}

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
  /**
   * HEIC output does NOT go through `applyFormat` — `main.ts` dispatches it to
   * `encodeHeicViaSips` before the encoder switch — so the metadata option
   * above does not govern it. What survives is whatever `sips` carries across.
   */
  metadataHeicCaveat:
    'HEIC output is transcoded by the system sips tool rather than the bundled encoder, so the metadata option does not apply to it.',
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
