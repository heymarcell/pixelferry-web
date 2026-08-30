---
title: Convert WebP to JPG on Mac — make downloaded images usable again
description:
  Images saved from the web are often WebP, and plenty of software still refuses
  them. What the conversion costs, and why the quality setting matters more here
  than usual.
heading: Convert WebP to JPG on a Mac
from: WebP
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  WebP is a delivery format, and saving an image from a web page increasingly
  hands you one. Converting back to JPG is the usual fix when the file has to go
  into software that predates the format.
whatChanges:
  - label: A third compression generation, often
    detail:
      A WebP found on the web has usually been through at least one lossy encode
      — though lossless WebP is common for screenshots and interface assets —
      and you cannot tell from the file what came before it. Converting to JPG
      adds another, so the quality setting matters more here than in a
      conversion from an original.
  - label: Transparency is filled
    detail:
      WebP can carry an alpha channel and JPEG cannot. Transparent areas are
      flattened onto white. If the image is a cut-out, convert to PNG instead
      and keep the channel.
  - label: Animation is lost
    detail:
      An animated WebP has multiple frames. JPEG is a single image, so only the
      first frame is written — and the conversion says so on the row rather than
      leaving you to notice.
  - label: Compatibility improves sharply
    detail:
      JPEG opens in everything, including the older desktop software, print
      portals and upload forms that reject WebP outright.
limitations:
  - Converting cannot recover quality lost on the way in. If the WebP was
    aggressively compressed, the JPEG inherits every artefact.
  - Animated WebP is reduced to its first frame; use GIF as the target if the
    motion matters.
  - The result will usually be larger than the WebP it came from, because JPEG
    is the less efficient codec.
useCases:
  - Getting images saved from a web page into design software or a CMS that
    rejects WebP uploads.
  - Preparing pictures for a print service, a photo book, or a form that only
    accepts JPEG.
  - Cleaning up a downloads folder full of mixed WebP and PNG into one
    consistent set.
macOSAlternative:
  method: Preview, or dwebp
  detail:
    macOS reads WebP natively since Big Sur, so Preview opens the file and
    exports JPEG. Google's `dwebp` handles it from Terminal if you already have
    the tools installed.
  breaksDownWhen:
    The downloads folder has thirty of them mixed with PNGs and HEICs, and you
    want one consistent JPEG set out the other end without picking through file
    types by hand.
related:
  - jpg-to-webp
  - png-to-webp
  - heic-to-jpg
---

## Why you keep ending up with these

Sites serve WebP because it is smaller. When you right-click and save an image
you get what the server sent, so the file on your disk is `.webp` — whatever the
site started from. Many are converted from JPEG uploads; some were authored as
WebP. The file itself does not record which.

macOS itself is fine with this. Preview, Finder and Quick Look have read WebP
since Big Sur. The friction is everywhere else: design software with older
importers, CMS upload validators with a fixed allow-list, print services, and
plenty of internal tools.

## Quality matters more here

This conversion deserves a higher quality setting than a normal export, and the
reason is the encoding history.

If the image was uploaded as a JPEG and re-encoded to WebP for serving — the
common case, though not one the file can confirm — then converting to JPG is a
third lossy generation, and each one is working on the previous one's artefacts.

Start at the app's default of 80, look at the result, and move from there. The
source has already been through a lossy encode you did not control and there is
no original to fall back on, so this is a case for checking rather than
guessing. The JPEG will usually be larger than the WebP, because JPEG is the
less efficient codec; convert two or three and read the per-row before/after
figures rather than assuming a number.

If the image is going somewhere size-sensitive, resize it rather than dropping
the quality. Fewer pixels at high quality looks considerably better than the
same pixels at low quality.

## Transparency and animation

Two cases where JPG is the wrong target:

**A cut-out with an alpha channel.** WebP holds transparency; JPEG does not.
PixelFerry flattens it onto white, which is the sensible default and still a
white box behind your subject. Convert to PNG instead.

**An animated WebP.** Increasingly common for what used to be GIFs. JPEG holds
one frame, so you get the first one and a note on the row saying only the first
frame was converted. If you want the motion, target GIF — PixelFerry preserves
every frame when the source is animated and the target is GIF or WebP — the only
two animated outputs PixelFerry writes. Turning whitespace trim on drops the
extra frames, and the row says so rather than doing it silently.

## A mixed downloads folder

The realistic version of this task is not "convert these WebPs" but "make this
folder consistent".

A downloads directory typically holds WebP from web pages, PNG from screenshots,
HEIC from an AirDrop, and a few JPEGs. Selecting by type and running four
separate conversions is the tedious way.

Drop the whole folder in instead. Everything readable joins one queue, one
output format and one quality apply to all of it, and anything unreadable is
marked on its own row rather than stopping the batch. That is the case the app
exists for.
