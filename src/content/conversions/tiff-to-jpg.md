---
title: Convert TIFF to JPG on Mac — archive scans to shareable files
description:
  TIFF is the lossless archive format for scans and print; JPG is what you send.
  What 16-bit depth and CMYK mean for the conversion, and why you edit first.
heading: Convert TIFF to JPG on a Mac
from: TIFF
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  TIFF files from scanners, print workflows and archives are often tens of
  megabytes each. Converting to JPG makes them shareable, at the cost of the
  editing headroom and the exactness that made TIFF the archive choice.
whatChanges:
  - label: Bit depth drops to 8
    detail:
      TIFF commonly carries 16 bits per channel from a scanner or a print
      workflow. Baseline JPEG is 8-bit, so 65,536 levels per channel become 256.
      Smooth gradients are where you would notice, and it is why you edit before
      converting, not after.
  - label: Colour space is remapped
    detail:
      A print-bound TIFF may be CMYK. The JPEG standard can carry CMYK, but
      PixelFerry writes RGB JPEGs, so a CMYK TIFF is converted for screen. Some
      saturated print colours have no RGB equivalent and shift.
  - label: Lossless becomes lossy
    detail:
      TIFF with LZW compression is pixel-exact. JPEG discards high-frequency
      detail permanently. For an archive master this is a downgrade; for a
      delivery copy it is the entire point.
  - label: Size collapses
    detail:
      A 16-bit scan is typically many times the size of the JPEG it converts to.
      Most of that comes from the bit depth and the lossy transform together, so
      the ratio varies with the scan.
limitations:
  - The conversion is one-way in quality terms. Keep the TIFF as the master — a
    JPEG can never be promoted back to an archive original.
  - Multi-page TIFFs convert their first page only; unlike PDF, they are not
    split into a folder of images.
  - Layered TIFFs saved from Photoshop are read as their flattened composite,
    the same way a PSD is.
useCases:
  - Sending scans from an archive or a museum digitisation project to someone
    who just needs to look at them.
  - Producing web-sized derivatives from a print production set without touching
    the masters.
  - Making a large scanning backlog browsable in Photos or a digital asset
    manager that struggles with very large files.
macOSAlternative:
  method: Preview, Finder's Quick Action, or sips
  detail:
    All three read TIFF and export JPEG. `sips -s format jpeg -s formatOptions
    85 scan.tiff --out scan.jpg` even takes a quality value, which makes it
    genuinely usable for scripted batches.
  breaksDownWhen:
    The archive is large and mixed. sips gives no progress, no per-file failure
    reporting, and no way to constrain output dimensions and quality together
    without writing the loop yourself.
related:
  - raw-to-jpg
  - psd-to-jpg
  - jpg-to-webp
---

## What TIFF is for

TIFF is the format you keep things in. It is lossless, it handles 16 bits per
channel, it carries CMYK and spot colour, and it has been stable long enough
that a file written in 1995 still opens.

That makes it right for scanning, print production and digital preservation, and
wrong for almost everything else. Safari displays TIFF; other browsers do not
without an add-on, so it is not a format to put on a page. Email clients choke
on the size, and most web upload tools reject it outright.

So the archive stays TIFF, and you convert copies.

## Do the editing first

This is the one piece of sequencing advice that matters.

Sixteen bits per channel exists so that you can push exposure and contrast
around without the histogram tearing into visible bands. Once you convert to
8-bit JPEG, that headroom is gone — and any correction you apply afterwards is
working with 256 levels per channel instead of 65,536.

Straighten, crop, colour-correct and dust-spot the TIFF. Then convert. Doing it
in the other order produces banding in exactly the smooth areas — skies, studio
backdrops, scanned paper — that you were trying to clean up.

## LZW, and why size varies so much

TIFF compression is optional and comes in several flavours. Uncompressed TIFF is
width × height × channels × bytes, exactly. LZW and ZIP compress losslessly,
with LZW doing well on flat content and poorly on noisy scans.

That is why one 40-megapixel scan is 90 MB and another is 240 MB. Nothing is
wrong with either. It also means the size reduction you get from converting to
JPEG varies enormously between files in the same batch, and the per-row
before/after figures are the only reliable way to know what actually happened.

When PixelFerry writes TIFF as an output format it uses LZW, which is the widely
compatible lossless choice.

## Batching a scanning archive

Scanning archives are the case this is built for: hundreds of large files, in
nested folders, with inconsistent naming.

Drop the top-level folder in. PixelFerry walks the tree. Set JPG, keep the
default quality until a sample tells you otherwise, and set a maximum width if
there is a delivery spec. Send the output to a separate folder so the
derivatives never mix with the masters.

Large TIFFs are slow to decode, and four run concurrently. The summary bar shows
a live count and an estimate based on the files that have already finished, so a
two-hour batch tells you it is a two-hour batch early rather than at the end.
