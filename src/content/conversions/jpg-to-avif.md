---
title: 'Convert JPG to AVIF on a Mac: a newer codec, a slower encode'
description:
  AVIF brings AV1's coding machinery to still images, at a real cost in encoding
  time. What it does well, what it costs, and when to prefer WebP instead.
heading: Convert JPG to AVIF on a Mac
from: JPG
to: AVIF
published: 2026-08-29
updated: 2026-08-29
summary:
  AVIF is built on the AV1 video codec, which gives it more to work with than
  JPEG on large photographs and smooth gradients. It is also markedly slower to
  encode on PixelFerry's encoder, which is what shapes when it is worth trying.
whatChanges:
  - label: A newer, more capable codec
    detail:
      AVIF uses AV1's intra-frame coding, with larger and variable block sizes,
      more prediction modes, and a better transform than JPEG's fixed 8×8 DCT.
      How much that is worth depends heavily on the image and on both encoders'
      settings, so convert a representative sample and read the actual
      before/after figures rather than trusting a headline percentage.
  - label: Encoding gets much slower
    detail:
      AV1 encoding is computationally heavy. Measured on PixelFerry's own
      encoder (sharp 0.35 / libvips 8.18, multithreaded, synthetic 12 MP source)
      AVIF at quality 80 took roughly 3–5x as long as mozjpeg and 2.5–3.5x as
      long as WebP across repeat runs. The multiple moves with the source and
      the libvips build, so treat it as a measured range rather than a constant.
      It is a one-time cost at export rather than a per-request one, though AVIF
      also costs the visitor more to decode than a JPEG.
  - label: Bit depth, and what PixelFerry actually writes
    detail:
      The AVIF format handles 10- and 12-bit per channel and wide colour gamuts
      natively, but PixelFerry writes 8-bit AVIF, the same depth as the JPEG you
      started from. Nothing is lost to bit depth on the way through, but the
      transcode is still another lossy encode unless you turn lossless on. This
      is not a route to a higher-precision master.
  - label: Where the codec has the most room to help
    detail:
      Smooth tonal transitions (skies, studio backdrops, soft shadows) are where
      JPEG's fixed 8x8 DCT shows banding first, and where AVIF's larger blocks
      and richer prediction have the most to work with. Whether that is visible
      on a given image depends on the content and the quality setting, so
      compare a sample rather than assuming it.
limitations:
  - Encoding is slow, roughly 3–5x mozjpeg and 2.5–3.5x WebP on PixelFerry's
    encoder, measured on a synthetic 12 MP source, one machine. A large batch is
    a background job, not something to wait on.
  - Support is broad in browsers and patchier outside them. Desktop software,
    email clients and upload validators often will not accept AVIF.
  - Converting from an existing JPEG is a second lossy generation, so the
    source's artefacts are preserved along with the picture.
useCases:
  - Squeezing the last significant saving out of a page whose largest asset is a
    hero photograph.
  - Serving high-resolution photography where the byte cost of retina-scale
    images is the binding constraint.
  - Building a modern format tier alongside WebP and JPEG fallbacks in a picture
    element.
macOSAlternative:
  method: avifenc, via Homebrew
  detail:
    The libavif reference encoder gives full control over speed/quality
    trade-offs, as in `avifenc -q 60 in.jpg out.avif`. macOS can also write AVIF
    itself, which is less well known. `sips --formats` on macOS 26 lists
    `public.avif` as Writable, so `sips -s format avif in.jpg --out out.avif`
    works with nothing installed. The Finder Quick Action does not offer it.
  breaksDownWhen:
    You need the same batch to produce a WebP and a JPEG tier as well, or want
    to see the actual saving per file rather than tuning encoder flags blind.
related:
  - jpg-to-webp
  - png-to-webp
  - webp-to-jpg
---

## Where AVIF actually wins

AVIF is the intra-frame part of AV1 wrapped in an HEIF container. It inherits a
decade of video codec research that JPEG, from 1992, obviously does not have.

The practical difference shows up most on:

- **Large photographs.** The bigger the image, the more the better prediction
  and larger block sizes pay off.
- **Smooth gradients.** Skies and soft shadows are where JPEG's 8x8 DCT bands
  first. AVIF has more room to avoid that, though how much shows on a given
  image depends on the content and on where each encoder's quality control is
  set, the two scales are not comparable, so this is a reason to test rather
  than a conversion factor.
- **Aggressive compression.** At low bitrates AVIF degrades into softness rather
  than into JPEG's blocking and ringing, a different kind of degradation, which
  many people find less objectionable at the same file size.

Where it wins least is small images and flat graphics, where the format overhead
is proportionally larger and [WebP lossless](/convert/png-to-webp) is usually
the better tool.

## The quality number means something different here

A quality value is an encoder-specific control, not a unit. AVIF's 80 and JPEG's
80 are set by different encoders against different models, and there is no
conversion between them, so carrying a JPEG habit across is the most common way
to be disappointed by AVIF.

The practical approach is the same one that works for any encoder you have not
used before: start at the app's default of 80, convert a representative handful,
look at them at the size they will be viewed, and read the per-row before/after
figures. Then move the number and repeat. That takes a couple of minutes and
beats any table.

What is worth knowing before you start is that a JPEG habit does not transfer.
The number that looked right there can look wrong here in either direction, so
read the output rather than assuming a direction of travel. Encode time does
change with the quality setting, and the figures measured here are at quality 80
only, so treat anything about the top of the scale as something to check on your
own files rather than a rule.

One measured illustration, on one file: against a deliberately noisy 12 MP test
source, PixelFerry's encoder produced an AVIF at quality 80 that was _larger_
than the WebP at the same nominal quality, and took about three times as long.
Heavy noise is close to worst case for AVIF's prediction, so that is not a
general result. It is a demonstration that the nominal numbers do not transfer
between encoders.

Lossless AVIF exists and is available. For flat content
[WebP lossless](/convert/png-to-webp) is the more common choice, and lossless
anything is very large for photographs, but if you need AVIF specifically, for
its colour handling, convert a sample of your own content and compare rather
than taking that as given.

## Support, honestly

In browsers, AVIF is supported across Chrome, Firefox, Safari and Edge, and has
been long enough in each that it is safe to serve behind a `<picture>` element
with a fallback.

Outside browsers, support is patchier than WebP's. Many desktop image tools do
not open AVIF, email clients generally do not render it, and upload validators
often reject the type. Check the specific destination rather than assuming
either way.

The conclusion is the same as WebP's, only more so: **AVIF is a delivery tier.**
Keep the source, generate AVIF for the web, and keep a JPEG fallback for
everything that is not a browser.

## Batching realistically

Set AVIF, start at the app's default of 80, set your delivery width, and start
the batch, then go and do something else. Four images encode concurrently, and
on this encoder each takes several times longer than a JPEG would. See the
measured ratios above for the conditions that number came from.

The summary bar's estimate becomes useful here in a way it is not for fast
formats: after the first few files finish, the remaining time is a real number
rather than a guess, so you know whether this is a five-minute job or an hour.
