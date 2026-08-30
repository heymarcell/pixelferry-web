---
title: 'Convert PNG to WebP on Mac: lossless, and usually smaller'
description:
  Lossless WebP keeps every 8-bit pixel and alpha value, and Google publishes
  26% smaller than PNG. What that figure rests on, when it holds, and when it
  does not.
heading: Convert PNG to WebP on a Mac
from: PNG
to: WebP
published: 2026-08-29
updated: 2026-08-29
summary:
  WebP's lossless mode stores the same 8-bit pixels and the same alpha channel,
  usually in fewer bytes than PNG. Google publishes 26%, and its lossless study
  measures 23% against an already-optimised PNG. What you trade is compatibility
  and encode time.
whatChanges:
  - label: Nothing in the pixels, if you choose lossless
    detail:
      Lossless WebP reproduces every pixel and every alpha value exactly, at 8
      bits per channel, the only depth WebP has. An 8-bit PNG, which is what
      PixelFerry writes, comes through untouched. A 16-bit PNG master is
      quantised on the way in. Any size reduction comes from a better
      compressor, not from discarded detail.
  - label: The compression method
    detail:
      WebP lossless uses spatial prediction, a colour-decorrelating transform,
      palette detection and entropy coding tuned per region. PNG filters each
      row and hands the result to DEFLATE. That difference is where Google's
      published gains come from. They are corpus averages rather than a figure
      any individual file is promised, and they depend on which PNG encoder you
      compare with.
  - label: Alpha handling improves
    detail:
      PNG stores alpha as a full extra channel. Lossy WebP compresses alpha in
      its own chunk. Lossless WebP folds it into the same ARGB stream as the
      colour, where the transform machinery handles a large uniform transparent
      area well either way.
  - label: Optionally, a lossy path opens up
    detail:
      WebP can compress the colour lossily while keeping an alpha channel, which
      PNG (always lossless) and JPEG (no alpha at all) cannot. AVIF can do the
      same, so this is not unique to WebP. For a large cut-out photograph,
      either one is far smaller than a PNG.
limitations:
  - Lossless WebP is usually smaller than PNG (Google publishes 26%, and 23%
    against a ZopfliPNG-optimised baseline), but not on every file, and it is
    slower to encode. On a batch of thousands the encode time is measurable,
    though it only costs you once.
  - WebP maxes out at 16383 pixels per side, so very large exports need to stay
    PNG.
  - WebP has no 16-bit mode, so a 16-bit PNG cannot round-trip through it at
    full precision. PixelFerry's own output is 8-bit either way.
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
    Running cwebp -lossless in.png -o out.webp gives the same pixels as the
    lossless mode here, though byte sizes differ slightly because the two pass
    different options to libwebp. Adding -q 80 -alpha_q 100 covers the
    lossy-with-alpha case.
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

WebP's lossless encoder and PNG's DEFLATE solve the same problem: store these
exact pixels in fewer bytes. WebP has more machinery for it. It predicts each
pixel from its neighbours using a predictor chosen per region, decorrelates the
colour channels, applies a palette where one helps, and entropy-codes the
residual. PNG, designed in 1996, filters each row and hands the result to
DEFLATE.

Google's headline figure, on its WebP overview page, is **26% smaller than
PNG**. Its separate _WebP Lossless and Alpha Study_ reports different figures
against named baselines, which are more useful: WebP lossless measured **23%
smaller than ZopfliPNG** and **42% smaller than libpng**.

The baseline is the whole story. Against a PNG already squeezed by ZopfliPNG,
expect nearer 23%. Against a straight libpng export, nearer 42%. All three are
corpus averages rather than guarantees, and a small, already-optimised PNG can
come out roughly the same size. The only way to know for a particular set is to
convert it and read the before/after figures on each row.

What you trade for those bytes is real, if usually acceptable:

- **Compatibility.** PNG opens in essentially everything. WebP does not. See
  below.
- **Encode time.** The lossless encoder does considerably more work than
  DEFLATE. It costs once, at export.

There is no _quality_ decision to make, which is what makes this conversion
simple. That is not the same as there being no decision at all.

## When to use lossy instead

Lossless is right for screenshots, icons, diagrams, and anything with text or
flat colour.

Lossy WebP becomes interesting when the PNG contains a **photograph**. People
save photographic content as PNG surprisingly often: a screenshot of a photo, an
export that defaulted to PNG, a cut-out product shot. PNG is the wrong container
for that material, and lossy WebP will usually be far smaller, because it is
discarding detail where PNG is not. Convert a couple at the app's default of 80
and read the per-row figures before committing to a setting for the rest.

This is where WebP earns its place over PNG for photographic cut-outs: **lossy
colour with an alpha channel**. A product shot on a transparent background would
otherwise have to be PNG, at full lossless cost, because JPEG has no alpha at
all.

[AVIF](/convert/jpg-to-avif) does the same thing, and often smaller. The
tradeoff there is encode time and thinner support outside browsers, not
capability.

## Screenshots, specifically

A documentation library is a good example of where this adds up. Screenshots are
large in pixel terms, mostly flat interface chrome with sharp text, and there
are usually hundreds of them.

That content suits WebP lossless well: the predictors handle flat panels neatly
and the palette detection catches interface colours. The text stays exactly as
crisp as it was, because nothing is discarded. How much smaller the files get
depends on the screenshots, so convert a handful and read the figures before
committing to the whole library.

## Running it

Drop the folder in and set WebP as the output. Turn **lossless** on for
interface and screenshot content. Leave it off and set a quality for
photographic content.

If the assets are being served at a known size, set the width in the same pass.
Between resizing and the codec change there is usually a substantial saving, and
the per-row before/after figures tell you which of the two did the work. That is
the part worth knowing.
