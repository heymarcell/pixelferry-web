---
title: Convert PNG to WebP on Mac — lossless, and usually smaller
description:
  Lossless WebP keeps every pixel and every alpha value, and Google measures it
  about 26% smaller than PNG on average. When that holds, and when it does not.
heading: Convert PNG to WebP on a Mac
from: PNG
to: WebP
published: 2026-08-29
updated: 2026-08-29
summary:
  WebP's lossless mode stores the same pixels and the same alpha channel in
  fewer bytes than PNG — about 26% fewer on average, in Google's own study. The
  pixels are identical; what you trade is compatibility and encode time.
whatChanges:
  - label: Nothing in the pixels, if you choose lossless
    detail:
      Lossless WebP reproduces every pixel and every alpha value exactly. Any
      size reduction comes from a better compressor, not from discarded detail.
      What does change is what can open the file, and how long encoding takes.
  - label: The compression method
    detail:
      WebP lossless uses spatial prediction, a colour-decorrelating transform,
      palette detection and entropy coding tuned per region. PNG filters each
      row and hands the result to DEFLATE. That difference is where Google's
      measured average of 26% comes from — an average across a corpus, not a
      figure any individual file is promised.
  - label: Alpha handling improves
    detail:
      PNG stores alpha as a full extra channel. WebP compresses alpha separately
      with its own predictors, so an image with a large uniform transparent area
      gets much smaller.
  - label: Optionally, a lossy path opens up
    detail:
      WebP can compress the colour lossily while keeping an alpha channel, which
      PNG (always lossless) and JPEG (no alpha at all) cannot. AVIF can do the
      same, so this is not unique to WebP — but for a large cut-out photograph
      either one is far smaller than a PNG.
limitations:
  - Lossless WebP is smaller than PNG but slower to encode. On a batch of
    thousands this is measurable, though it only costs you once.
  - WebP maxes out at 16383 pixels per side, so very large exports need to stay
    PNG.
  - A few non-browser tools still will not open WebP, so keep PNG masters for
    anything that gets handed to other software.
useCases:
  - Shrinking a site's interface assets, icons and illustrations without any
    visible change at all.
  - Compressing a documentation or knowledge-base screenshot library, where PNG
    is the default and the files are large.
  - Serving cut-out product images with transparency at a fraction of the PNG
    size using lossy-with-alpha.
macOSAlternative:
  method: cwebp with the -lossless flag
  detail:
    Running cwebp -lossless in.png -o out.webp gives the same result as the
    lossless mode here, and -q 80 -alpha_q 100 covers the lossy-with-alpha case.
  breaksDownWhen:
    You want to see the saving per file, need to resize an asset set in the same
    pass, or simply do not want a Homebrew toolchain on the machine to convert
    some screenshots.
related:
  - jpg-to-webp
  - heic-to-png
  - jpg-to-avif
---

## A better compressor for the same pixels

WebP's lossless encoder and PNG's DEFLATE solve the same problem — store these
exact pixels in fewer bytes. WebP has more machinery for it: it predicts each
pixel from its neighbours using a predictor chosen per region, decorrelates the
colour channels, applies a palette where one helps, and entropy-codes the
residual. PNG, designed in 1996, filters each row and hands the result to
DEFLATE.

Google's _WebP Lossless and Alpha Study_ puts the difference at **26% smaller on
average**. That is a corpus average, not a guarantee: a small, already-optimised
PNG can come out roughly the same size, and the only way to know for a
particular set is to convert it and read the before/after figures on each row.

What you trade for those bytes is real, if usually acceptable:

- **Compatibility.** PNG opens in essentially everything. WebP does not — see
  below.
- **Encode time.** The lossless encoder does considerably more work than
  DEFLATE. It costs once, at export.

There is no _quality_ decision to make, which is what makes this conversion
simple. That is not the same as there being no decision at all.

## When to use lossy instead

Lossless is right for screenshots, icons, diagrams, and anything with text or
flat colour.

Lossy WebP becomes interesting when the PNG contains a **photograph**. People
save photographic content as PNG surprisingly often — a screenshot of a photo,
an export that defaulted to PNG, a cut-out product shot — and for that material
PNG is the wrong container entirely. Lossy WebP at quality 80 is typically a
small fraction of the PNG's size; convert a couple and read the row figures
before committing to a setting.

This is where WebP earns its place over PNG for photographic cut-outs: **lossy
colour with an alpha channel**. A product shot on a transparent background would
otherwise have to be PNG, at full lossless cost, because JPEG has no alpha at
all.

[AVIF](/convert/jpg-to-avif) does the same thing, and often smaller. The
tradeoff there is encode time and thinner support outside browsers — not
capability.

## Screenshots, specifically

A documentation library is a good example of where this adds up. Screenshots are
large in pixel terms, mostly flat interface chrome with sharp text, and there
are usually hundreds of them.

That content is close to the best case for WebP lossless: the predictors handle
flat panels almost perfectly, and the palette detection catches interface
colours. Savings at the upper end of the range are normal, and the text stays
exactly as crisp as it was.

## Running it

Drop the folder in and set WebP as the output. Turn **lossless** on for
interface and screenshot content; leave it off and set a quality for
photographic content.

If the assets are being served at a known size, set the width in the same pass.
Between resizing and the codec change, a typical unoptimised asset folder halves
or better — and the per-row before/after figures tell you which of the two did
the work.
