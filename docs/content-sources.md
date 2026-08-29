# Content sources

Where the non-obvious technical claims on this site come from.

This exists because the anti-scaled-content audit measures _uniqueness_, not
_truth_. Three independent reviews of PR #2 each found confidently-written
statements that were simply wrong and that every automated check had passed.
Duplication tooling cannot catch that; a short, checkable list can.

**The rule** (also in `CLAUDE.md`): any new numerical compression, quality,
compatibility, performance or macOS-behaviour claim must be verified against a
current primary source or an actual PixelFerry benchmark before it is published.
If neither is available, the number does not go on the page.

**This file records what is defensible NOW.** It is not an audit trail. Claims
that were once published and later found false live in
`docs/audits/public-claim-ledger-2026-08-29.md`, with their verdicts — they are
deliberately not preserved here, because a source document that contradicts
itself is worse than none.

---

## The upstream app state

| Ref                                          | SHA                                        | Status     |
| -------------------------------------------- | ------------------------------------------ | ---------- |
| App `origin/main`                            | `f107ef72836c422f000e31a1100b129d23a53f8d` | released   |
| App PR #70 (`fix/conversion-pipeline-truth`) | merged as the commit above                 | **MERGED** |

Resolve app state with `git rev-parse origin/main` — never from a local
checkout, and never from a PR head, which can move before it merges. Both
mistakes were made here; see the pin history in
`docs/audits/public-claim-ledger-2026-08-29.md`.

---

## Primary sources, in the order they are trusted

For anything about what **PixelFerry itself does**:

1. **Executable source** — `apps/desktop/src/main/*.ts`, especially
   `pipeline.ts`, `main.ts` and `decode.ts`.
2. **Tests exercising that source** — `pipeline.test.ts`, `e2e/*.spec.ts`.
3. **Typed shared configuration the UI and pipeline both consume** —
   `shared/settings.ts`, `shared/constants.ts`.
4. **README and docs, last** — and never as the sole basis for a published
   claim.

The order is not academic. The app README asserted "SVG, **HEIC**, PSD, PDF, RAW
are input-only" while the source had been writing HEIC all along; that one line
propagated into this site's data model, its FAQ, its structured data, `llms.txt`
and a test that enforced the false invariant. It is still wrong on app main
(`e3f3fbf:README.md:81`) and corrected on PR #70 (`048a5a4:README.md:87`).

For everything else:

5. **Apple documentation** — macOS, Preview, Finder, ImageIO behaviour.
6. **Format specifications** — what a format can and cannot represent.
7. **MDN** — cross-format capability and browser support.
8. **Google / web.dev** — WebP's own studies, read at source rather than quoted.
9. **Official codec and library documentation** — libvips, libwebp, libavif.

Secondary sources are used for orientation, never as the basis of a figure.

---

## macOS behaviour

| Claim on the site                                                                                               | Source                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Preview resizes **multiple** images at once — display in one window, select in the sidebar, Tools → Adjust Size | Apple, _Resize, rotate, or flip an image in Preview on Mac_                                                                      |
| Finder's **Convert Image** Quick Action offers JPEG / PNG / HEIF and **four** size presets                      | Apple Finder Quick Actions documentation; verified on macOS 26.5.1                                                               |
| `sips -Z` caps the long edge and preserves aspect; `-z` forces exact dimensions and distorts                    | `man sips`                                                                                                                       |
| `sips` **writes AVIF** and does **not** write WebP                                                              | Measured, macOS 26.5.1 (25F80): `sips --formats` lists `public.avif … Writable`; `org.webmproject.webp` carries no Writable flag |
| macOS built-ins cannot output WebP                                                                              | Follows from the above — Preview and Quick Actions both encode through ImageIO                                                   |

## Format capability

| Claim on the site                                                                                                  | Source                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lossy WebP is **25–34%** smaller than JPEG at matched SSIM                                                         | Google, _WebP Compression Study_ — four datasets (Lenna, Kodak, Tecnick, Image_crawl). **Baseline: libjpeg 6b with `-optimize`, against libwebp 0.1.2.** PixelFerry encodes JPEG with mozjpeg, which is stronger, so the gap against its own output is narrower — both pages say so |
| Lossless WebP is **26%** smaller than PNG                                                                          | Google's **WebP overview page**, `developers.google.com/speed/webp`. This figure is **not** in the _WebP Lossless and Alpha Study_ — see the next row                                                                                                                               |
| Lossless WebP is **23%** smaller than ZopfliPNG and **42%** smaller than libpng                                    | Google, _WebP Lossless and Alpha Study_. The study recompresses its PNG corpus with ImageMagick, pngcrush and ZopfliPNG and takes the smallest, so the baseline is an already-optimised PNG. The baseline is the whole story and the pages state it                                 |
| WebP can be **larger** than the source in some conversions                                                         | Google WebP FAQ                                                                                                                                                                                                                                                                     |
| WebP has **no 16-bit mode**                                                                                        | WebP container and VP8L specifications                                                                                                                                                                                                                                              |
| **AVIF supports alpha, lossy compression, and both together**, at 8/10/12-bit                                      | MDN, _Image file type and format guide_. This is why no page claims WebP is the only format with lossy + alpha                                                                                                                                                                      |
| **Safari has displayed HEIC** in `<img>` and `<picture>` since version 17, and WKWebView with it                   | Apple Safari 17 release notes; MDN HEIF entry                                                                                                                                                                                                                                       |
| **Safari displays TIFF**; other browsers do not                                                                    | MDN, _Image file type and format guide_                                                                                                                                                                                                                                             |
| TIFF is a **container**, not a compression scheme — it can hold JPEG-compressed data                               | TIFF 6.0 specification, `Compression` tag                                                                                                                                                                                                                                           |
| Baseline JPEG is 8-bit and has no alpha; the spec also defines 12-bit and lossless modes that are rare in practice | ITU-T T.81                                                                                                                                                                                                                                                                          |

## What PixelFerry does — measured, not cited

| Claim                                                                                          | Measurement                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The pipeline is 8-bit end to end**                                                           | Every encoder branch in `applyFormat` is called with no `bitdepth`. Measured with sharp 0.35.3 / libvips 8.18.3, feeding a 16-bit `rgb16` source into the exact shipping calls and reading the result back: `png({compressionLevel:9})`, `tiff({compression:'lzw'})`, `webp({lossless:true})` and `avif({lossless:true})` all return `depth: 'uchar'`                                                             |
| The macOS HEIC read path produces a **16-bit intermediate** that the encode then drops         | `sips -s format tiff` on a HEIC yields `depth: ushort`, `space: rgb16`; the final PNG is `uchar`. So the precision loss is real and happens at the encode step                                                                                                                                                                                                                                                    |
| macOS hardware HEIC decode is **several times faster** than the bundled pure-JS fallback       | Measured: `sips -s format tiff` **153 ms** vs `heic-convert` **1868 ms** on a 12 MP HEIC (6.6 MB, synthetic photographic source), median of 3, one machine — a ratio of **12.2×**. The public copy stays qualitative because one synthetic run on one machine does not support a precise public multiple. The app's own `~7×` code comment is **not** evidence and is not cited on the site                       |
| AVIF encode is **3–5× mozjpeg and 2.5–3× WebP**                                                | Three runs disagreed — 5.2× (sharp 0.35.4/libvips 8.18.6), 4.0× and 3.4× (shipped 0.35.3/8.18.3) — so the site states a range and says the multiple moves with the source and the libvips build                                                                                                                                                                                                                   |
| AVIF at quality 80 can be **larger** than WebP at 80                                           | Same harness, deliberately noisy source: AVIF 2991 KiB vs WebP 1465 KiB. Cited as an illustration that the quality scales are not comparable, never as a general size claim                                                                                                                                                                                                                                       |
| Whitespace trim uses the **dominant corner colour**                                            | `detectBorderColor` (`main/pipeline.ts`) samples all four corners, clusters by colour distance ≤ 24 and takes the most common; the top-left corner is only the seed. On app main today                                                                                                                                                                                                                            |
| **PSD decoding is limited**: 8-bit composites only, no ICC carried, CMYK misread               | `decode.ts` parses with `@webtoon/psd`, calls `composite()` and hands the result to sharp as a **raw RGBA buffer** — which carries no profile, so `keepIccProfile()` has nothing to keep. `psd.colorMode` is never consulted, so a CMYK document is read positionally (K lands in alpha). The library throws `Unsupported image bit depth` for non-8-bit. On app main today — see the app follow-up in the ledger |
| PDF rasterises at a fixed **2x viewport scale** (~144 dpi), not configurable                   | `decode.ts` `viewportScale: 2.0`                                                                                                                                                                                                                                                                                                                                                                                  |
| PDF page files are named `name-1`, `name-2`, … — **every** page numbered, not zero-padded      | `main.ts` writes `` `${folderBase}-${i + 1}${ext}` ``                                                                                                                                                                                                                                                                                                                                                             |
| Metadata removal is **on by default**; the ICC profile is kept when it is on                   | `DEFAULT_RECIPE.removeMetadata: true`; `pipeline.ts` `removeMetadata ? keepIccProfile() : keepMetadata()`                                                                                                                                                                                                                                                                                                         |
| Output is written **beside the source** by default                                             | `DEFAULT_SETTINGS.defaultSaveLocation: { type: 'input-folder' }`                                                                                                                                                                                                                                                                                                                                                  |
| The target-size search is bounded at **8 attempts** down to quality 10, and reports a miss     | `pipeline.ts` `TARGET_MAX_ITERATIONS`, and the "Couldn't reach the target size" warning                                                                                                                                                                                                                                                                                                                           |
| The folder walk stops at **5,000 files** and **10 levels**, skipping hidden files and symlinks | `collectImages.ts`                                                                                                                                                                                                                                                                                                                                                                                                |
| macOS 14+, Apple silicon and Intel                                                             | `apps/desktop/package.json` `build.mac.minimumSystemVersion: "14.0"`                                                                                                                                                                                                                                                                                                                                              |
| The format matrix — 76 extensions across 23 families, output set, quality formats              | `shared/constants.ts` `CROSS_PLATFORM_EXTENSIONS` (17) and `MACOS_ONLY_EXTENSIONS` (59); `shared/settings.ts` `OUTPUT_FORMAT_ORDER` and `QUALITY_FORMATS`. Mirrored into `src/data/formats.ts`, pinned by `test/format-model.test.ts`                                                                                                                                                                             |

### Merged in PR #70 — verified on the resulting main

| Claim                                                                                      | Evidence                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PDF → HEIC` and `PDF → ICO` work; `/formats` says any input converts to any output format | PDF pages route through the shared `processAndWriteImage`. Before the merge these threw "Unsupported output format"                                  |
| Whitespace trim and target size apply to **PDF pages**                                     | Same change; previously they sat after an early return and were silently skipped per page                                                            |
| HEIC output honours the metadata / ICC policy                                              | The HEIC path was `resized.png()` with no policy, so it stripped the ICC profile and a Display P3 photo came out untagged                            |
| Enabling trim no longer destroys metadata                                                  | Trim continued the encode from a raw pixel buffer, which carries no ICC or EXIF. The buffer is now geometry only and the encode reopens the original |

---

## What the desktop privacy claim rests on

`apps/desktop/e2e/desktop-security.spec.ts` walks `src/main`, `src/renderer` and
`src/shared` and fails if `fetch(`, `net.fetch(`, `net.request(`,
`new WebSocket(`, `new XMLHttpRequest(` or `new EventSource(` appears — a
source-level guard, because the main process is not bound by CSP.

Two limits on what that proves, both stated on the site:

- It greps **those six patterns**. It would not catch Node `http`/`https`,
  `child_process` (already imported for `sips`), `navigator.sendBeacon`, an
  aliased call, a dependency, or the compiled bundle.
- It is a claim about the **desktop app**, not the project. `api.pixelferry.app`
  exists and is deployed.

As of the audited commits the shipping desktop app has **no network client at
all** — no updater, no licence call, no telemetry, no crash reporter;
`electron-updater` and Sentry appear in no lockfile, and the only `net.fetch`
resolves a `file://` URL inside the app bundle. The app's own privacy policy
describes update checks, licence validation, a beta safety check and bug reports
in the present tense **for clients that have not been built**. So "nothing is
uploaded" is true today, and will stop being true the moment an updater ships.

---

## Reproducing the benchmarks

These are the only numbers on this site measured rather than cited, so they must
be reproducible.

**Encoder timings.** Against `sharp` — pinned to the version the app actually
bundles, currently 0.35.3 / libvips 8.18.3 — encode a ~12 MP photographic source
three times per format using the exact calls in `pipeline.ts`
(`jpeg({quality, mozjpeg: true})`, `webp({quality})`, `avif({quality})`) and
take the median. Record the sharp and libvips versions with the result: the
ratio moved from 5.2× to 3.4× across library versions and sources, which is why
the site states a range.

**Bit depth.** Feed a 16-bit `rgb16` source into each shipping encoder call and
read `metadata().depth` back from the output file.

**HEIC decode.** Time `sips -s format tiff` against `heic-convert` on the same
HEIC, median of three.

Do not carry any figure forward across a major sharp or libvips change without
re-measuring.

---

## What is deliberately _not_ claimed

Removed during the correction passes, and not to come back:

- **Quality-number equivalences** between formats ("WebP 80 ≈ JPEG 85"). A
  quality value is a control on one encoder, not a unit. The pages give the
  app's real default of 80 as a starting point and tell the reader to measure.
- **Invented quality bands** — "55–65", "80–85", "below 65", "85 is a reasonable
  proof default". None were sourced.
- **"Strictly better", "no downside", "a free win"** for WebP over PNG.
- **"The only format that can do lossy + alpha"**. AVIF can too.
- **"Preview works on one image at a time"**. Apple documents the opposite.
- **"No browser displays HEIC"**. Safari 17+ does.
- **"Almost nothing outside Apple's ecosystem reads HEIC"**.
- **Unattributed size percentages and multipliers** of any kind, including "ten
  to twenty times the size of an equivalent JPEG".
- **Invented failure rates** — "on a batch of eight hundred, a handful will be
  truncated or corrupt".
- **"Invisible" / "indistinguishable"** as absolutes about lossy compression.
- **"Neutral"** for Apple's RAW rendering. It is a rendering choice like any
  other.
- **"Perfect copy" / "adds no new quality loss"** for any conversion. The
  pipeline is 8-bit; a deeper source is quantised.
- **Superlatives in the format model** — "universal", "best", "smallest",
  "workhorse", "archival", "successor". The app removed the same class of
  wording from its own format blurbs on PR #70.
- **A figure attached to a named study that does not contain it.**
