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
 *
 * Re-verified at `1627350`, which landed DURING the review that produced
 * docs/audits/public-claim-ledger-2026-08-29.md — a live demonstration of why a
 * date is not a snapshot. Three app commits changed behaviour this site
 * describes:
 *
 *   61c52fa  PDF pages now go through the same pipeline as everything else.
 *            PDF -> HEIC and PDF -> ICO used to THROW; trim and target size
 *            were silently ignored per page. "Any input can be converted to any
 *            of these" on /formats is true now, and was not before.
 *   06e780b  HEIC output now honours the metadata policy. The previous caveat
 *            here said the option "does not apply to it" — true at f6bd954,
 *            false now. Corrected below.
 *   1627350  Adds e2e/pipeline-parity.spec.ts, which pins that both source
 *            paths reach the same capabilities.
 *
 * The format matrix in `formats.ts` is unaffected: read/write capability per
 * format did not change.
 */
export const PRODUCT_FACTS_APP_COMMIT = '16273508d9a0a025c28cab28b104c49f55439819'

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
  /**
   * The app's own starting point — `DEFAULT_RECIPE.codecs` sets quality 80 for
   * jpg, webp, avif AND heic. Content pages anchor on this rather than on
   * invented per-format thresholds, because this is a fact about the product
   * and those were opinions dressed as measurements.
   */
  defaultQuality: 80,

  /**
   * THE PIPELINE IS 8-BIT END TO END. Every encoder branch in `applyFormat` is
   * called without a `bitdepth` option, so libvips writes 8 bits per channel
   * whatever the source was.
   *
   * Measured against the shipping calls (sharp 0.35.3 / libvips 8.18.3), with a
   * 16-bit `rgb16` source, reading the resulting file back:
   *
   *   png({compressionLevel: 9})   -> depth uchar
   *   tiff({compression: 'lzw'})   -> depth uchar
   *   webp({lossless: true})       -> depth uchar
   *   avif({lossless: true})       -> depth uchar
   *
   * And on the macOS HEIC read path, `sips -s format tiff` really does produce a
   * 16-bit intermediate (`depth ushort`) — which the final encode then drops to
   * 8. So the precision loss is real and it happens at the encode step.
   *
   * This is why no page may say a conversion is "lossless", "pixel-exact" or a
   * "perfect copy" without scoping it to 8 bits: those words were true of the
   * CODEC and false of the PIPELINE, and /convert/heic-to-png asserted both at
   * once. `test/pipeline-claims.test.ts` guards it.
   *
   * The app makes the same distinction for itself — `shared/settings.ts` notes
   * that HEIC and AVIF may not advertise "HDR" because the pipeline cannot put
   * any in them.
   */
  bitDepth: {
    output: 8,
    note: 'PixelFerry writes 8 bits per channel in every format it outputs.',
    /** True of the codec, but not of what PixelFerry puts through it. */
    losslessMeans:
      'no compression artefacts are added; a source deeper than 8 bits per channel is still quantised on the way through',
  },
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
  /**
   * `DEFAULT_RECIPE.removeMetadata` is `true` in the app, so this is ON out of
   * the box. The site said "by default yes [kept]" for a month; it was wrong.
   */
  metadataRemovedByDefault: true,
  metadata:
    'Metadata removal is on by default: EXIF, XMP and IPTC are stripped, while the ICC colour profile is kept either way, so a Display P3 image stays Display P3.',
  /**
   * HEIC output does NOT go through `applyFormat` — `main.ts` dispatches it to
   * `encodeHeicViaSips` before the encoder switch — so the metadata option
   * above does not govern it. What survives is whatever `sips` carries across.
   */
  /**
   * Corrected at app `06e780b`. The HEIC path used to bypass the metadata
   * policy entirely — its PNG intermediate inherited Sharp's default, which
   * strips even the ICC profile, so a Display P3 photo came out untagged. It now
   * applies the same policy as every other encoder. What remains true is that
   * `sips` writes a small EXIF block of its own, so a HEIC is never completely
   * EXIF-free — that block is macOS's, not the source image's.
   */
  metadataHeicCaveat:
    'HEIC output follows the same metadata policy as every other format, but the system sips tool writes a small EXIF block of its own, so a HEIC is never completely EXIF-free.',
  targetSize:
    'A target file size re-encodes at successive quality values to fit it — up to eight attempts, down to quality 10. If even that overshoots, the smallest result is saved and reported rather than silently missing the target.',
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
