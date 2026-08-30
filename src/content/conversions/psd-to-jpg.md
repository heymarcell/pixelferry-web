---
title: Convert PSD to JPG on Mac in a batch, without Photoshop
description:
  JPG suits a flattened PSD when it is photographic and has to be small. What
  happens to transparency, how to pick a quality, and how to batch a folder.
heading: Convert PSD to JPG on a Mac
from: PSD
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  Converting a Photoshop document to JPG flattens the layer stack and compresses
  the result for size. It is the right choice for photographic comps and the
  wrong one for anything with transparency or hard-edged type.
whatChanges:
  - label: Transparency is filled in
    detail:
      JPEG has no alpha channel. PixelFerry flattens transparent areas onto
      white rather than the black the underlying encoder would default to, which
      is what you want for a comp on a white page and not what you want for a
      logo.
  - label: The layer stack is baked
    detail:
      The stored composite becomes the image. Blend modes, masks and adjustment
      layers are applied as they appeared at save time and cease to be
      separable.
  - label: Compression artefacts appear at edges
    detail:
      JPEG's block-based transform produces ringing around high-contrast
      boundaries. Photographic content hides this well; the crisp typography and
      flat panels typical of design files show it early.
  - label: Size drops sharply
    detail:
      A layered PSD is usually far larger than the JPEG it flattens to. Two
      things account for that, the layer data is discarded, and the composite a
      PSD stores was never lossily compressed in the first place.
limitations:
  - Transparency is destroyed, not preserved. If the asset has a cut-out
    background, use PNG or WebP instead.
  - PixelFerry writes 8-bit RGB JPEG. A 16-bit PSD fails outright, the bundled
    decoder reads 8-bit composites only. A CMYK PSD is worse, because it does
    not fail at all. It is misread, since the decoder never consults the
    document's colour mode. Convert both in Photoshop.
  - The conversion reads the composite Photoshop stores with "Maximize
    Compatibility" on. It does not render the layer stack, so a PSD saved
    without that composite has nothing useful to read.
  - PSD is input-only, so this is one-way, the JPEG cannot be turned back into a
    layered file.
useCases:
  - Emailing a client a set of design comps that need to be small enough to
    actually arrive.
  - Producing web-sized previews of a photographic retouch archive where the
    PSDs are hundreds of megabytes each.
  - Filling a slide deck or a PDF with flattened mockups where file size matters
    more than pixel-exactness.
macOSAlternative:
  method: Preview's export
  detail:
    Preview reads the PSD composite and offers JPEG export with a quality
    slider, which covers a single file completely adequately.
  breaksDownWhen:
    The job is a directory of fifty retouch files, or you need every export
    capped at the same width, or you want to know which files failed without
    checking the output folder by hand.
related:
  - psd-to-png
  - tiff-to-jpg
  - heic-to-jpg
---

## The transparency question decides this

Before anything else: does the artwork have a transparent background?

If it does, **JPG is the wrong target**. There is no alpha channel in a JPEG, so
the transparency has to become some colour. PixelFerry uses white, which is the
least-bad default and the one that matches what people expect, but a white
rectangle behind your cut-out logo is still a white rectangle.

For those files, [PSD to PNG](/convert/psd-to-png) is the conversion you want.

If the artwork is a photograph, a full-bleed layout, or anything that already
fills its canvas edge to edge, JPG is exactly right and the size difference is
enormous.

## Picking a quality

The quality slider runs 1–100 and PixelFerry encodes with **mozjpeg**, which
generally produces smaller files than a baseline libjpeg encode at the same
visual quality.

Start at the app's default of 80, export a couple of representative comps, and
look at them at the size the client will. Then adjust.

What is worth knowing is which direction to adjust in: design files punish low
quality more than photographs do, because they contain more hard edges. Blocking
in flat panels and haloes around type are the first things to appear. If a comp
is mostly interface or typography, err upward, or reconsider whether it should
be a PNG.

There is also a **target file size** mode, which re-encodes at successive
quality values to fit a limit you set, up to eight attempts, down to quality 10.
If even that overshoots, it saves the smallest result and tells you it could not
reach the target, rather than guessing at a quality number and checking the
folder afterwards.

## Progressive encoding

Progressive JPEGs load as a low-resolution version first and sharpen in, rather
than painting top to bottom. On a slow connection that reads as faster even
though the byte count is similar, and progressive files are often marginally
smaller.

It is off by default because a handful of older tools still mishandle it, and on
for anything web-facing is a reasonable rule.

## Batching a retouch archive

This is where the difference shows. Point PixelFerry at the directory, set JPG,
set a quality and a delivery width, and pick a destination folder outside the
originals.

Output never overwrites the source and never replaces an existing file, a
collision gets a `_converted` suffix. On an archive where filenames repeat
across subfolders, that behaviour is the difference between a delivery set and a
lost afternoon.
