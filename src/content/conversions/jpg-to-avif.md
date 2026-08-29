---
title: Convert JPG to AVIF on Mac — the smallest current web format
description:
  AVIF beats JPEG by 40–50% and WebP by 15–20%, at a real cost in encoding time.
  Where it is genuinely supported, when to prefer WebP, and how to batch a set.
heading: Convert JPG to AVIF on a Mac
from: JPG
to: AVIF
published: 2026-08-29
updated: 2026-08-29
summary:
  AVIF is the most efficient widely-supported image format available today,
  built on the AV1 video codec. It produces markedly smaller files than JPEG or
  WebP, and it is slow to encode — which shapes when it is worth using.
whatChanges:
  - label: A substantially better codec
    detail:
      AVIF uses AV1's intra-frame coding — larger and variable block sizes, far
      more prediction modes, and a better transform than JPEG's fixed 8×8 DCT.
      The result is 40–50% smaller than JPEG at comparable perceived quality.
  - label: Encoding gets much slower
    detail:
      AV1 encoding is computationally heavy. Expect AVIF to take several times
      longer per image than JPEG or WebP. This is a one-time cost at build or
      export, not a cost to the visitor.
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
  - Encoding is slow. A large batch is a background job, not something to wait
    on.
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

## The quality scale is different

AVIF quality numbers do not map onto JPEG's. The commonly useful range is lower
than people expect:

- **60–65** is roughly equivalent to JPEG 85 in perceived quality, at around
  half the size.
- **50** is still very usable for large background imagery.
- **Above 80** the returns diminish sharply and the files stop being small
  enough to justify the encoding time.

If you set AVIF at quality 85 because that is your JPEG habit, you will produce
files barely smaller than the JPEG and wonder what the fuss was about.

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

Set AVIF, set a quality in the 55–65 range, set your delivery width, and start
the batch — then go and do something else. Four images encode concurrently and
each one is genuinely slow.

The summary bar's estimate becomes useful here in a way it is not for fast
formats: after the first few files finish, the remaining time is a real number
rather than a guess, so you know whether this is a five-minute job or an hour.
