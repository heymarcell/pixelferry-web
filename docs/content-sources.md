# Content sources

Where the non-obvious technical claims on this site come from.

This exists because the anti-scaled-content audit measures _uniqueness_, not
_truth_ — and an independent review of PR #2 found several confidently-written
statements that were simply wrong. Duplication tooling cannot catch that. A
short, checkable list can.

**The rule** (also in `CLAUDE.md`): any new numerical compression, quality,
compatibility, performance or macOS-behaviour claim must be verified against a
current primary source or an actual PixelFerry benchmark before it is published.
If neither is available, the number does not go on the page.

---

## Primary sources, in the order they are trusted

1. **`pixelferry-app`** — source and tests, for anything about what PixelFerry
   itself does. `apps/desktop/src/main/pipeline.ts` is the pipeline; `README.md`
   §2 and §7 are the format and behaviour reference.
2. **Apple documentation** — for macOS, Preview, Finder and ImageIO behaviour.
3. **Format specifications** — for what a format can and cannot represent.
4. **MDN** — for cross-format capability comparisons.
5. **Google / web.dev** — for WebP's own measured studies.
6. **Official codec and library documentation** — libvips, libwebp, libavif.

Secondary sources are used only for orientation, never as the basis of a stated
figure.

---

## Claims and their sources

| Claim on the site                                                                                                                                                     | Source                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preview can resize **multiple** images at once — display them in one window, select in the sidebar, Tools → Adjust Size                                               | Apple, _Resize, rotate, or flip an image in Preview on Mac_: "To resize multiple images at the same time, display the images in the same window, select them in that window's sidebar, then choose Tools > Adjust Size."             |
| Finder's **Convert Image** Quick Action offers JPEG / PNG / HEIF and four size presets                                                                                | Apple, Finder Quick Actions documentation; verified in macOS                                                                                                                                                                         |
| `sips -Z` caps the long edge and preserves aspect; `-z` forces exact dimensions and distorts                                                                          | `man sips`                                                                                                                                                                                                                           |
| Lossy WebP is **25–34%** smaller than JPEG at matched SSIM                                                                                                            | Google, _WebP Compression Study_ — four datasets (Lenna, Kodak, Tecnick, Image_crawl), libwebp 0.1.2 vs libjpeg 6b, compared at equal SSIM. Stated on the site as a study average, with its variability.                             |
| Lossless WebP is about **26%** smaller than PNG                                                                                                                       | Google, _WebP Lossless and Alpha Study_, quoted in the WebP FAQ. An average.                                                                                                                                                         |
| WebP can be **larger** than the source in some conversions                                                                                                            | Google WebP FAQ, "Why is my WebP file bigger than…" — PNG-with-few-colours to lossy WebP, and JPEG to lossless WebP.                                                                                                                 |
| **AVIF supports alpha, lossy compression, and both together**, at 8/10/12-bit                                                                                         | MDN, _Image file type and format guide_ — AVIF: "Alpha support", "Lossy and lossless", "Bits: 8/10/12-bit". This is why no page claims WebP is the only format with lossy + alpha.                                                   |
| AVIF encoding on **PixelFerry's own encoder** is ~5× mozjpeg and ~3× WebP                                                                                             | Measured locally against sharp 0.35.4 / libvips 8.18.6, multithreaded, on a synthetic 12 MP photographic source; median of 3 runs. JPEG q80 446 ms, WebP q80 762 ms, AVIF q80 2308 ms. Reproduce with the benchmark described below. |
| AVIF at quality 80 can be **larger** than WebP at 80                                                                                                                  | Same benchmark: AVIF q80 2991 KiB vs WebP q80 1465 KiB on a deliberately noisy source. Cited on the site as an illustration that the quality scales are not comparable, not as a general size claim.                                 |
| No browser displays **HEIC** natively                                                                                                                                 | MDN, _Image file type and format guide_ — HEIF/HEIC is not in the list of browser-supported image formats.                                                                                                                           |
| HEIC decoding via macOS `sips` is **~7×** the speed of the pure-JS fallback                                                                                           | `pixelferry-app` README §2: "decoded with the macOS hardware codec (`sips`, out-of-process, ~7× faster than pure JS)". Stated on the site as a comparison against PixelFerry's own fallback decoder, which is what was measured.     |
| macOS 14+, Apple silicon and Intel; the format matrix; the 100-page PDF cap; PSD composite flattening; JPEG flattening onto white; ICC kept when metadata is stripped | `pixelferry-app` — `CLAUDE.md`, `README.md` §1/§2/§7, `apps/desktop/src/main/pipeline.ts`. Mirrored into `src/data/product.ts` and guarded by `test/product-claims.test.ts`.                                                         |

---

## Second pass — product truth (2026-08-29)

A cross-repo review found the site still publishing wrong product facts. These
were reconciled against **executable source**, not the app README, at
`pixelferry-app` commit `3309d0b5c89b29abeb458a39e37c554ad5364011`.

| Claim                                                                                                                                           | Type           | Source                                                                                                                                                                                                            | Verdict             | Action                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| HEIC is input-only                                                                                                                              | capability     | `shared/settings.ts` (VALID_FORMATS, OUTPUT_FORMAT_ORDER, QUALITY_FORMATS, FORMAT_CATALOG, DEFAULT_RECIPE.codecs.heic), `main/main.ts` `encodeHeicViaSips`, `pipeline.ts` `buildHeicSipsArgs`, `pipeline.test.ts` | **FALSE**           | HEIC modelled as writable, macOS-only                                                                                             |
| HEIC output works everywhere                                                                                                                    | capability     | `main.ts`: `if (process.platform !== 'darwin') throw new Error('HEIC output is only available on macOS.')`                                                                                                        | would be false      | write pinned to `'macos'`                                                                                                         |
| ICO/ICNS are both input-only                                                                                                                    | capability     | ICO output via `png-to-ico` in `encodeIco`, not platform-gated; ICNS never written                                                                                                                                | **FALSE**           | per-format read/write; ICO write `'anywhere'`, read `'macos'`                                                                     |
| /formats is the complete reference (15 families)                                                                                                | completeness   | `shared/constants.ts` — 17 cross-platform + 59 macOS-only = **76** extensions                                                                                                                                     | **INCOMPLETE**      | 23 families, all 76 extensions, test-enforced                                                                                     |
| Metadata is kept by default                                                                                                                     | behaviour      | `shared/settings.ts` `DEFAULT_RECIPE.removeMetadata: true`                                                                                                                                                        | **FALSE**           | corrected — removal is ON by default                                                                                              |
| Metadata option governs HEIC output                                                                                                             | behaviour      | `main.ts` returns from `encodeHeicViaSips` before `applyFormat` runs                                                                                                                                              | **FALSE**           | caveat added                                                                                                                      |
| "no browser displays HEIC natively"                                                                                                             | compatibility  | WebKit, _WebKit Features in Safari 17.0_ — HEIC support in Safari, Safari View Controller and WKWebView                                                                                                           | **FALSE**           | Safari 17+ named; support outside WebKit described as limited (HEVC licensing)                                                    |
| "browsers do not display TIFF"                                                                                                                  | compatibility  | MDN: "Other than Safari, browsers do not natively support TIFF images in web content"                                                                                                                             | **FALSE**           | Safari named as the exception                                                                                                     |
| sips can write AVIF                                                                                                                             | capability     | `sips --formats`, macOS 26.5.1 (25F80) — `public.avif avif Writable`                                                                                                                                              | **TRUE**            | stated, with the command                                                                                                          |
| sips can write WebP                                                                                                                             | capability     | same run — `org.webmproject.webp webp` with **no** Writable flag                                                                                                                                                  | **FALSE**           | cwebp still named as the route, with the reason                                                                                   |
| sips can write HEIC                                                                                                                             | capability     | same run — `public.heic heic Writable`                                                                                                                                                                            | **TRUE**            | corroborates PixelFerry's encode path                                                                                             |
| "the source was almost certainly a JPEG" (WebP→JPG)                                                                                             | inference      | not knowable from a `.webp` file                                                                                                                                                                                  | **UNPROVABLE**      | removed                                                                                                                           |
| "the JPEG being larger is unavoidable"                                                                                                          | absolute       | depends on both encoders and settings                                                                                                                                                                             | **OVERSTATED**      | softened to "usually"                                                                                                             |
| "quality 90 or higher is the right default"                                                                                                     | prescription   | no source; encoder-specific                                                                                                                                                                                       | **UNSUPPORTED**     | replaced with "start above the app default of 80, then measure"                                                                   |
| "lossless WebP is smaller than PNG" (absolute)                                                                                                  | absolute       | Google's own FAQ documents cases where WebP is larger                                                                                                                                                             | **OVERSTATED**      | qualified, consistent with the 26% average elsewhere on the page                                                                  |
| "a small fraction", "halves or better", "upper end of the range"                                                                                | quantitative   | unmeasured                                                                                                                                                                                                        | **UNSUPPORTED**     | removed                                                                                                                           |
| AVIF is universally slowest / one range is correct / lossless AVIF always inferior                                                              | generalisation | one benchmark, one configuration                                                                                                                                                                                  | **OVERGENERALISED** | benchmark relabelled as one measurement on one file                                                                               |
| "none of those decisions are in the RAW file"                                                                                                   | technical      | RAW carries as-shot white balance and picture style as metadata                                                                                                                                                   | **IMPRECISE**       | rewritten — the distinction is baked-in RGB pixels, not absence of metadata                                                       |
| "JPEG is 8-bit RGB"                                                                                                                             | technical      | JPEG can carry CMYK; PixelFerry writes RGB (`pipeline.ts` `flatten(#ffffff).jpeg(...)`, no CMYK path)                                                                                                             | **CONFLATED**       | scoped to baseline JPEG and to PixelFerry's own output                                                                            |
| "30 MB RAW → 3–6 MB JPEG", "60 MB TIFF → 2–5 MB", "200 MB PSD → 1–3 MB", "1.5 MB HEIC → 10–25 MB PNG", "ten times the size", "2500 pixels wide" | quantitative   | no benchmark behind any of them                                                                                                                                                                                   | **UNSUPPORTED**     | all removed                                                                                                                       |
| Quality thresholds 85 / 90+ / 75–80 / 55–65 / below 70                                                                                          | prescription   | invented; a "starting point" label does not source them                                                                                                                                                           | **UNSUPPORTED**     | replaced with the app's real default (`DEFAULT_RECIPE` quality **80** for jpg/webp/avif/heic) plus "convert a sample and measure" |
| "There is no server in this product"                                                                                                            | architecture   | the desktop app has no outbound path (`desktop-security.spec.ts`), but the PixelFerry project does operate an API                                                                                                 | **MISLEADING**      | rescoped to "the desktop app does not upload…"                                                                                    |

### What the desktop privacy claim rests on

`apps/desktop/e2e/desktop-security.spec.ts` walks `src/main`, `src/renderer` and
`src/shared` and fails if any `fetch`, `net.fetch`, `net.request`, `WebSocket`,
`XMLHttpRequest` or `EventSource` call appears — a source-level guard, because
the main process is not bound by CSP. So "the desktop app does not upload your
files" is provable today.

"There is no server in this product" was not: the project runs
`api.pixelferry.app`, and the app's own privacy policy (updated at the pinned
commit) describes update checks, licence validation — which stores a hashed
per-install device id — a beta safety check, and bug reports with a Discord
triage webhook. The site now says what is true of the desktop conversion
surface, and does not make a claim about the project as a whole.

---

## Reproducing the encoder benchmark

The AVIF timing figures are the only numbers on this site measured rather than
cited, so they need to be reproducible. Against `sharp` (the same library
PixelFerry converts with), encode a ~12 MP photographic source three times per
format using the exact calls in `pipeline.ts` —
`jpeg({quality, mozjpeg: true})`, `webp({quality})`, `avif({quality})` — and
take the median.

Re-run it if the claim is ever restated with different numbers, and update the
table above. Do not carry the figures forward across a major sharp or libvips
change without re-measuring.

---

## What is deliberately _not_ claimed

These were removed during the correction pass, and should not come back:

- **Quality-number equivalences** between formats ("WebP 80 ≈ JPEG 85", "AVIF
  60–65 ≈ JPEG 85"). A quality value is a control on one encoder, not a unit;
  there is no conversion between them. The pages give _starting points_ and tell
  the reader to measure.
- **"Strictly better", "no downside", "a free win"** for WebP over PNG. The
  pixels are identical in lossless mode, but compatibility and encode time are
  real costs, and Google documents cases where WebP is larger.
- **"The only format that can do lossy + alpha"**. AVIF can too.
- **"Preview works on one image at a time"**. Apple documents the opposite.
- **"Almost nothing outside Apple's ecosystem reads HEIC"**. Current Windows and
  many editors do; the real gaps are upload forms, older software and browsers.
- **Unattributed size percentages** of any kind.
- **"Invisible" / "indistinguishable"** as absolutes about lossy compression.
- **"Neutral"** for Apple's RAW rendering. It is a rendering choice like any
  other, and calling it neutral implies an authority nothing here establishes.

## Third pass — claim-level forensic review (2026-08-29)

Triggered by a reported self-contradiction on `/convert/heic-to-png`, which
turned out to be one instance of a systemic class. Two earlier passes and every
automated check had gone green over it, because each half of the contradiction
is true in isolation.

### The 8-bit pipeline — measured, not inferred

Every encoder branch in the app's `applyFormat` is called without a `bitdepth`
option, so libvips writes 8 bits per channel whatever the source was. Measured
with sharp 0.35.3 / libvips 8.18.3, feeding a 16-bit `rgb16` source into the
exact shipping calls and reading the result back:

| Shipping call                  | Output depth    |
| ------------------------------ | --------------- |
| `png({ compressionLevel: 9 })` | `uchar` (8-bit) |
| `tiff({ compression: 'lzw' })` | `uchar` (8-bit) |
| `webp({ lossless: true })`     | `uchar` (8-bit) |
| `avif({ lossless: true })`     | `uchar` (8-bit) |

And on the macOS HEIC read path, `sips -s format tiff` genuinely produces a
16-bit intermediate (`depth: ushort`, `space: rgb16`) which the final encode
then drops to 8. **The precision loss is real, and it happens at the encode
step.**

So "lossless" is a true statement about the codec and a false one about the
conversion. Recorded as `limits.bitDepth` in `src/data/product.ts` and guarded
by `test/pipeline-claims.test.ts`. The app enforces the same rule on itself —
`shared/settings.ts` forbids the format blurbs from saying "HDR" for this
reason.

### HEIC decode, hardware vs portable

`sips -s format tiff` versus the bundled `heic-convert` fallback, 12 MP HEIC
(6.6 MB, synthetic photographic source), median of 3, one machine:

| Path                            | Time    |
| ------------------------------- | ------- |
| `sips` (ImageIO, hardware HEVC) | 153 ms  |
| `heic-convert` (pure JS)        | 1868 ms |

That is **12.2×**, not the "roughly seven times" the homepage claimed. The 7×
figure came from a code comment in `main/macos.ts` and the app README — never
from a measurement — while the homepage said "PixelFerry measures". One
synthetic run on one machine is not grounds for a precise public number either,
so the site now says "several times faster" and the measurement lives here.

### Citation integrity

`/convert/png-to-webp` attributed **26% smaller than PNG** to Google's _WebP
Lossless and Alpha Study_, by name, in four places. That study reports **23%
against ZopfliPNG** and **42% against libpng**; the 26% headline is from the
WebP overview page at `developers.google.com/speed/webp`. Both halves were
individually true, which is what made it survive.

The lossy figure (25–34% vs JPEG at matched SSIM) is correctly attributed, but
its baseline is **libjpeg 6b with `-optimize`** — and PixelFerry encodes JPEG
with mozjpeg, which is stronger, so the gap against its own output is narrower.
Both pages now say so.

### macOS built-in capability

`sips --formats` on macOS 26.5.1 lists `public.avif` as **Writable** and
`org.webmproject.webp` as not. `/guides/batch-convert-images-on-mac` said "No
WebP or AVIF output" and made it one of three headline reasons a dedicated tool
exists, while `/convert/jpg-to-avif` on the same site said the opposite. The
AVIF half was false; the WebP half is correct and now carries the evidence.

### App defaults that the site described backwards

Verified in `shared/settings.ts` `DEFAULT_RECIPE` / `DEFAULT_SETTINGS`:

| Fact                                                            | Source                                        | Site had said                                   |
| --------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| `removeMetadata: true`                                          | `settings.ts:225`                             | "Optionally strip EXIF…"                        |
| `dontUpscale: true`                                             | `settings.ts:226`                             | not mentioned for Crop/Fill                     |
| `defaultSaveLocation: input-folder`                             | `settings.ts:245`                             | "leaves your source folder exactly as it was"   |
| `TARGET_MAX_ITERATIONS = 8`, may miss target                    | `pipeline.ts:20, 290-309`                     | "searches quality values until the output fits" |
| walk caps: 5000 files, depth 10, no dotfiles or symlinks        | `collectImages.ts:36-37, 76, 88`              | "picks up everything it can read"               |
| only `mac` build target declared; win32/linux paths unit-tested | `package.json`, `clipboardFile.test.ts:39-40` | "never been built, signed or tested"            |
