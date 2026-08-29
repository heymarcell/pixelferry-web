---
title: Convert JPG to AVIF on Mac — the smallest current web format
description:
  AVIF usually produces the smallest files of the current web formats, at a real
  cost in encoding time — measured here at 5x mozjpeg. Where it is supported,
  and when to prefer WebP.
heading: Convert JPG to AVIF on a Mac
from: JPG
to: AVIF
published: 2026-08-29
updated: 2026-08-29
summary:
  AVIF is built on the AV1 video codec and is usually the smallest of the
  widely-supported web formats, particularly on large photographs and smooth
  gradients. It is also the slowest to encode, which is what shapes when it is
  worth using.
whatChanges:
  - label: A substantially better codec
    detail:
      AVIF uses AV1's intra-frame coding — larger and variable block sizes, far
      more prediction modes, and a better transform than JPEG's fixed 8×8 DCT.
      How much that is worth depends heavily on the image and on both encoders'
      settings, so convert a representative sample and read the actual
      before/after figures rather than trusting a headline percentage.
  - label: Encoding gets much slower
    detail:
      AV1 encoding is computationally heavy. Measured on PixelFerry's own
      encoder (sharp 0.35 / libvips 8.18, multithreaded, 12 MP photographic
      source) AVIF at quality 80 took about 5x as long as mozjpeg and 3x as long
      as WebP. That is a one-time cost at export, not a cost to the visitor.
  - label: Higher bit depth becomes available
    detail:
      AVIF handles 10- and 12-bit per channel and wide colour gamuts natively.
      Converting from an 8-bit JPEG gains nothing from this, but it means AVIF
      does not become the bottleneck later.
  - label: Gradients hold together better
    detail:
      AVIF's handling of smooth tonal transitions is noticeably better than
      JPEG's. Skies, studio backdrops and soft shadows band far less at
      aggressive compression levels.
limitations:
  - Encoding is slow — roughly 5x mozjpeg and 3x WebP on PixelFerry's encoder,
    measured on a 12 MP photograph. A large batch is a background job, not
    something to wait on.
  - Support is broad in browsers but thin outside them — desktop software, email
    clients and CMS validators frequently reject AVIF.
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
    trade-offs — `avifenc -q 60 in.jpg out.avif`. macOS also encodes AVIF
    through ImageIO in some contexts, though not from a Finder Quick Action.
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
- **Smooth gradients.** This is AVIF's clearest visible advantage. A sky that
  bands at JPEG quality 60 typically holds together at an equivalent AVIF
  setting.
- **Aggressive compression.** At low bitrates AVIF degrades into softness rather
  than into JPEG's blocking and ringing, which reads as far less broken.

Where it wins least is small images and flat graphics, where the format overhead
is proportionally larger and [WebP lossless](/convert/png-to-webp) is usually
the better tool.

## The quality number means something different here

A quality value is an encoder-specific control, not a unit. AVIF's 80 and JPEG's
80 are set by different encoders against different models, and there is no
conversion between them — so carrying a JPEG habit across is the most common way
to be disappointed by AVIF.

As a **starting point** in PixelFerry, not an equivalence:

- **55–65** is where AVIF usually earns its size advantage on photographs.
- **50** is often still fine for large background imagery.
- **Above 80** the encode time climbs steeply while the size advantage narrows.

Setting AVIF to 85 out of JPEG habit is worth avoiding. On a deliberately noisy
12 MP test source, PixelFerry's encoder produced an AVIF at quality 80 that was
_larger_ than the WebP at the same nominal quality, and took three times as long
to make — heavy noise is close to worst case for AVIF's prediction. Drop the
number and measure your own images; the per-row before/after figures exist for
exactly this.

Lossless AVIF exists and is available, but it is not competitive with
[WebP lossless](/convert/png-to-webp) for flat content and is enormous for
photographs. Use it only when you specifically need AVIF's colour handling.

## Support, honestly

In browsers, AVIF is supported across Chrome, Firefox, Safari and Edge, and has
been for long enough to use without a second thought behind a `<picture>`
element with a fallback.

Outside browsers the picture is much worse than WebP's. Many desktop image tools
will not open an AVIF. Email clients largely will not render one. CMS upload
validators frequently reject the type.

The conclusion is the same as WebP's, only more so: **AVIF is a delivery tier.**
Keep the source, generate AVIF for the web, and keep a JPEG fallback for
everything that is not a browser.

## Batching realistically

Set AVIF, start around quality 55–65, set your delivery width, and start the
batch — then go and do something else. Four images encode concurrently, and each
takes several times longer than the JPEG equivalent would.

The summary bar's estimate becomes useful here in a way it is not for fast
formats: after the first few files finish, the remaining time is a real number
rather than a guess, so you know whether this is a five-minute job or an hour.
