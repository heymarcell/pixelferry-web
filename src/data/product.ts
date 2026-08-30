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
 * theoretical. The app README once said "SVG, HEIC, PSD, PDF, RAW are
 * input-only" while `shared/settings.ts` listed `heic` in VALID_FORMATS,
 * OUTPUT_FORMAT_ORDER and QUALITY_FORMATS, `main.ts` dispatched
 * `format === 'heic'` to `encodeHeicViaSips`, and `pipeline.test.ts` tested
 * `buildHeicSipsArgs`. Following the README put a false claim on this site for
 * a month.
 *
 * At the pinned commit the README AGREES with the source — it lists the eight
 * output formats and says HEIC reads anywhere and writes on macOS. The ordering
 * still stands: a README that happens to be right is not the thing to check.
 *
 * `npm test` guards the facts that have already drifted (see
 * `test/product-claims.test.ts`).
 */

/** Date of the last manual reconciliation against the app repo. */
export const PRODUCT_FACTS_SYNCED = '2026-08-29'

/**
 * ── THE UPSTREAM DEPENDENCY IS RESOLVED ────────────────────────────────────
 *
 * Some behaviour this site describes existed only on `pixelferry-app` PR #70
 * (`fix/conversion-pipeline-truth`). That PR is now MERGED, and this snapshot
 * is pinned to the resulting `origin/main`.
 *
 * The history is kept because it is the reason this block exists at all:
 *
 *   - An earlier pass pinned `f6bd954` and `1627350` as though they were app
 *     main. They were not. It had resolved app state from a locally
 *     checked-out feature branch instead of `origin/main`, and those SHAs were
 *     pre-rebase artefacts. ALWAYS use `git rev-parse origin/main`.
 *   - A later pass correctly identified PR #70 as open and pinned its head
 *     `048a5a4` as a PENDING candidate. That head then moved to `5e0d58a`
 *     before merging — two further commits — so even a correctly-identified
 *     candidate SHA was not what shipped.
 *
 * Verified on the merged main rather than assumed from the PR: the HEIC
 * metadata/ICC policy, the shared `processAndWriteImage` path, and
 * `e2e/pipeline-parity.spec.ts` are all present, and the README no longer
 * calls HEIC input-only. The format matrix is byte-identical to the snapshot
 * in `test/format-model.test.ts` — `OUTPUT_FORMAT_ORDER`, `QUALITY_FORMATS`,
 * and 17 cross-platform / 59 macOS-only extensions.
 *
 * Two commits arrived between the audited candidate and the merge:
 *   ff0540e  trim no longer discards the image's metadata lineage. Trim used to
 *            continue the encode from a raw pixel buffer, which carries no ICC
 *            or EXIF, so turning trim on silently inverted the metadata
 *            contract in both directions. Nothing on this site claimed
 *            otherwise, and the fix makes main MORE consistent with what the
 *            site says about metadata and colour.
 *   5e0d58a  a desktop e2e timing fix. No public behaviour.
 */

/**
 * ── RE-SYNC PROCEDURE ──────────────────────────────────────────────────────
 *
 *   1. `git -C ../pixelferry-app fetch --all && git rev-parse origin/main`
 *      — origin/main, never a local checkout, never a PR head.
 *   2. If the sync target is an unmerged PR, pin it as a candidate and set
 *      PRODUCT_FACTS_APP_PENDING accordingly. A candidate head can still move
 *      before it merges, so re-verify against the merge result.
 *   3. Re-read the four source files (see CLAUDE.md) and re-copy the snapshot
 *      arrays in `test/format-model.test.ts`.
 *   4. Bump PRODUCT_FACTS_SYNCED, PRODUCT_FACTS_APP_COMMIT and
 *      PRODUCT_FACTS_APP_MAIN.
 *   5. `npm run verify`.
 */

/**
 * The EXACT `pixelferry-app` revision these capabilities were verified against.
 *
 * A date is too weak for a cross-repository truth snapshot — it says when
 * someone looked, not what they looked at. This says what they looked at.
 *
 * It is an audit marker for humans and agents, not a runtime dependency: public
 * CI must never clone the private repo. The tests here prove the website agrees
 * with THIS SNAPSHOT, not that it will agree with app main tomorrow.
 */
export const PRODUCT_FACTS_APP_COMMIT: string = 'f107ef72836c422f000e31a1100b129d23a53f8d'

/** `origin/main` of the app at the time of the last reconciliation. */
export const PRODUCT_FACTS_APP_MAIN: string = 'f107ef72836c422f000e31a1100b129d23a53f8d'

/**
 * Whether PRODUCT_FACTS_APP_COMMIT is an unmerged candidate rather than main.
 * `test/upstream-dependency.test.ts` requires the two SHAs to be equal when
 * this is not pending, and to differ when it is — so a candidate pin cannot be
 * quietly presented as released, and a released pin cannot be left flagged.
 */
export const PRODUCT_FACTS_APP_PENDING = {
  pending: false,
  pr: 70,
  branch: 'fix/conversion-pipeline-truth',
  status: 'MERGED',
} as const

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
  outputFormats,
  outputFormatLabels,
  OUTPUT_ORDER,
  groups,
  capabilityOf,
} from './formats'

import {
  readableFormats as _readable,
  writableFormats as _writable,
  readOnlyFormats as _readOnly,
} from './formats'

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

/** What the app does to an image, in pipeline order (`main/pipeline.ts`). */
export const capabilities = {
  autoOrient: 'EXIF orientation is applied, so output matches the thumbnail.',
  /**
   * `detectBorderColor` (app `main/pipeline.ts`) samples ALL FOUR corners,
   * clusters them by colour distance <= 24, and takes the most common as the
   * border colour; the top-left corner is only the seed value, used when no
   * corner agrees with another. "Keyed off the top-left pixel" described an
   * implementation the app does not have. Present on app main today, not
   * dependent on PR #70.
   */
  trim: 'Optional solid-border trim, using the dominant corner colour.',
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
    'Metadata removal is on by default: EXIF, XMP and IPTC are stripped, while the ICC colour profile is kept either way on the formats that carry one through the decoder, so a Display P3 photo stays Display P3. PSD and PDF are the exception — those decoders hand over bare pixels, so no source profile survives.',
  /**
   * HEIC output still takes its own route — `main.ts` dispatches it to
   * `encodeHeicViaSips` before the encoder switch, rather than through
   * `applyFormat` — but it now applies the SAME metadata contract explicitly:
   * the PNG intermediate handed to `sips` gets `keepIccProfile()` when removal
   * is on and `keepMetadata()` when it is off.
   *
   * It previously did not, and inherited Sharp's strip-everything default, so a
   * Display P3 photo came out untagged. Verified on app main.
   *
   * True regardless: `sips` writes a small EXIF block of its own, so a HEIC is
   * never completely EXIF-free — that block is macOS's, not the source's.
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
