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
 * ── THIS SITE HAS AN OPEN UPSTREAM DEPENDENCY ──────────────────────────────
 *
 * Some product behaviour described on this site exists ONLY on an unmerged
 * branch of `heymarcell/pixelferry-app`. Read this before changing any product
 * copy, and before merging or deploying anything.
 *
 * The three refs, and they are three different things:
 *
 *   APP MAIN            e3f3fbf5a845213ca0cc68cb5875522f5f55bcb4
 *                       What is actually released today.
 *
 *   APP PR #70 HEAD     048a5a49aba943941e940b5109bb78a65a510fc9
 *                       Branch `fix/conversion-pipeline-truth`. OPEN and
 *                       UNMERGED. Branched from 3309d0b, so it does NOT
 *                       contain app main's latest commit either.
 *
 *   VERIFIED AGAINST    PR #70 head — see PRODUCT_FACTS_APP_COMMIT below.
 *
 * A previous pass called the PR #70 commits "landed" and pinned them as though
 * they were main. They were not, and are not. That mistake came from reading a
 * local checked-out feature branch instead of `origin/main`, and it is exactly
 * the class of error the pin exists to prevent — so it is recorded here rather
 * than quietly corrected.
 */

/**
 * ── WHAT DEPENDS ON PR #70, AND WHAT DOES NOT ──────────────────────────────
 *
 * TRUE ON APP MAIN TODAY (no dependency):
 *   - the whole read/write format matrix in `formats.ts`
 *   - the 8-bit output pipeline (`limits.bitDepth`)
 *   - four-corner border detection (`limits.trim`)
 *   - the PSD decoder's limits — 8-bit composites, no ICC, CMYK misread
 *   - metadata removal on by default, quality default 80, 100-page PDF cap
 *
 * REQUIRES PR #70 TO MERGE BEFORE IT IS TRUE:
 *   - PDF -> HEIC and PDF -> ICO. On main these THROW
 *     "Unsupported output format"; /formats says "Any input can be converted to
 *     any of these", which is true only on the PR branch.
 *   - whitespace trim and target-size applied to PDF pages. Silently ignored
 *     per page on main.
 *   - HEIC output honouring the metadata/ICC policy. On main the HEIC path is
 *     `resized.png()` with no policy, so it strips the ICC profile and a
 *     Display P3 photo comes out untagged. See `capabilities.metadataHeicCaveat`.
 *
 * The website deliberately describes the PR #70 state, because web PR #2 is not
 * permitted to merge before it. That is a sequencing decision, not an accident,
 * and it is why the dependency is written here in the file every product claim
 * reads from.
 */

/**
 * ── RELEASE SEQUENCE — DO NOT REORDER ──────────────────────────────────────
 *
 *   1. Independently approve app PR #70.
 *   2. Merge app PR #70.
 *   3. Fetch the resulting real `pixelferry-app/main` SHA.
 *   4. Verify the behaviour above survived the merge (squash rewrites SHAs;
 *      a rebase can drop a commit).
 *   5. Re-pin PRODUCT_FACTS_APP_COMMIT to THAT main SHA and re-verify the
 *      snapshot arrays in `test/format-model.test.ts`.
 *   6. Re-run the web gates.
 *   7. Only then consider merging web PR #2 or cutting over production.
 */

/**
 * The EXACT `pixelferry-app` revision these capabilities were verified against.
 *
 * A date is too weak for a cross-repository truth snapshot — it says when
 * someone looked, not what they looked at. This says what they looked at.
 *
 * THIS IS THE PENDING PR #70 CANDIDATE, NOT `origin/main`. It is an audit
 * marker for humans and agents, not a runtime dependency: public CI must never
 * clone the private repo. The tests here prove the website agrees with THIS
 * SNAPSHOT — not with app main, and not with whatever main becomes after the
 * PR merges.
 */
export const PRODUCT_FACTS_APP_COMMIT: string = '048a5a49aba943941e940b5109bb78a65a510fc9'

/** `origin/main` of the app at the time of the last reconciliation. */
export const PRODUCT_FACTS_APP_MAIN: string = 'e3f3fbf5a845213ca0cc68cb5875522f5f55bcb4'

/**
 * Whether PRODUCT_FACTS_APP_COMMIT is an unmerged candidate rather than main.
 * `test/upstream-dependency.test.ts` fails if this is false while the two SHAs
 * differ, so the dependency cannot be silently dropped.
 */
export const PRODUCT_FACTS_APP_PENDING = {
  pending: true,
  pr: 70,
  branch: 'fix/conversion-pipeline-truth',
  status: 'OPEN',
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

/** What the app does to an image, in pipeline order (README §7). */
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
    'Metadata removal is on by default: EXIF, XMP and IPTC are stripped, while the ICC colour profile is kept either way, so a Display P3 image stays Display P3.',
  /**
   * HEIC output does NOT go through `applyFormat` — `main.ts` dispatches it to
   * `encodeHeicViaSips` before the encoder switch — so the metadata option
   * above does not govern it. What survives is whatever `sips` carries across.
   */
  /**
   * DEPENDS ON APP PR #70 (commit `06e780b`), which is OPEN and UNMERGED.
   *
   * On app main today the HEIC path is `resized.png()` with no metadata policy,
   * so it inherits Sharp's default, strips even the ICC profile, and a Display
   * P3 photo comes out untagged. PR #70 makes it apply the same policy as every
   * other encoder.
   *
   * The wording below describes the PR #70 behaviour, because web PR #2 cannot
   * merge before it. If PR #70 is ever abandoned, this string must revert to
   * saying the metadata option does not govern HEIC output.
   *
   * True in BOTH states: `sips` writes a small EXIF block of its own, so a HEIC
   * is never completely EXIF-free — that block is macOS's, not the source's.
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
