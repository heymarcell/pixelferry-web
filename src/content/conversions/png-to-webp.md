---
title: Convert PNG to WebP on Mac — lossless, and much smaller
description:
  WebP lossless beats PNG by about 25% on the same pixels, transparency
  included. When to use lossless, when lossy is fine, and how to batch a folder
  of UI assets.
heading: Convert PNG to WebP on a Mac
from: PNG
to: WebP
published: 2026-08-29
updated: 2026-08-29
summary:
  WebP has a lossless mode that is strictly better than PNG at the same job —
  identical pixels, alpha channel intact, around a quarter smaller. For
  screenshots and interface assets this is a conversion with no downside worth
  naming.
whatChanges:
  - label: Nothing, if you choose lossless
    detail:
      Lossless WebP reproduces every pixel and every alpha value exactly. The
      file is smaller because the compressor is better, not because anything was
      discarded. This is the unusual case of a genuinely free win.
  - label: The compression method
    detail:
      WebP lossless uses spatial prediction, a colour-decorrelating transform,
      palette detection and entropy coding tuned per region. PNG's DEFLATE has
      none of that, which is where the roughly 25% comes from.
  - label: Alpha handling improves
    detail:
      PNG stores alpha as a full extra channel. WebP compresses alpha separately
      with its own predictors, so an image with a large uniform transparent area
      gets much smaller.
  - label: Optionally, a lossy path opens up
    detail:
      WebP can be lossy and still keep transparency — something PNG cannot do
      and JPEG cannot do. For a large cut-out photograph, lossy WebP with alpha
      is dramatically smaller than any PNG.
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

## The one conversion that is close to free

Most format changes are a trade. This one, in lossless mode, essentially is not.

WebP's lossless encoder and PNG's DEFLATE are solving the same problem — store
these exact pixels in fewer bytes — and WebP is simply better at it. It predicts
each pixel from its neighbours using a choice of predictors selected per region,
decorrelates the colour channels, detects and applies a palette where one helps,
and then entropy-codes the residual.

PNG, designed in 1996, filters each row and hands the result to DEFLATE.

The result on typical interface content is 20–30% smaller with byte-identical
output pixels. There is no quality decision to make and nothing to check
afterwards.

## When to use lossy instead

Lossless is right for screenshots, icons, diagrams, and anything with text or
flat colour.

Lossy WebP becomes interesting when the PNG contains a **photograph**. People
save photographic content as PNG surprisingly often — a screenshot of a photo,
an export that defaulted to PNG, a cut-out product shot — and for that material
PNG is the wrong container entirely. Lossy WebP at quality 80 can be a tenth of
the size.

The thing WebP can do that nothing else can: **lossy compression with a real
alpha channel**. A cut-out product photograph on a transparent background has to
be PNG today, at full lossless cost, because JPEG cannot hold the transparency.
Lossy WebP holds both.

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
