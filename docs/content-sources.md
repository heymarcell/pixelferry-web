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
