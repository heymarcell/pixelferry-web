---
title: Convert camera RAW to JPG on Mac without uploading anything
description:
  CR3, NEF, ARW, RAF and DNG are sensor data, not pictures. What demosaicing
  does, why macOS gives a different look from Lightroom, and how to batch a card
  locally.
heading: Convert camera RAW to JPG on a Mac
from: RAW
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  A RAW file is unprocessed sensor data that has to be interpreted before it is
  an image at all. macOS does that interpretation with ImageIO, which is fast,
  consistent, and deliberately neutral — and it happens entirely on your
  machine.
whatChanges:
  - label: Demosaicing
    detail:
      A sensor records one colour per photosite behind a Bayer filter. Turning
      that into a full-colour image means interpolating the two missing channels
      for every pixel. This is the step that makes a RAW file into a picture,
      and different software does it differently.
  - label: The rendering decisions
    detail:
      White balance, tone curve, colour rendering and sharpening are not stored
      as pixels in a RAW file — they are choices. macOS ImageIO applies its own
      neutral interpretation, which is why the result looks different from
      Lightroom's or Capture One's default.
  - label: Editing latitude
    detail:
      RAW keeps 12–14 bits per channel of headroom, which is what lets you
      recover a blown sky or lift shadows without banding. JPEG's 8 bits discard
      that. Recover what you need before converting, not after.
  - label: File size
    detail:
      A 30 MB CR3 typically becomes a 3–6 MB JPEG at high quality. The reduction
      comes from throwing away the editing headroom you are no longer going to
      use.
limitations:
  - RAW decoding here goes through macOS ImageIO, so this conversion is
    macOS-only and its look is ImageIO's, not your raw converter's.
  - PixelFerry applies no exposure, white balance or tone adjustments. It is a
    converter, not a raw developer — if the shot needs work, develop it first
    and convert the export.
  - RAW is input-only. There is no route back from the JPEG to an editable RAW.
useCases:
  - Turning a full card of shots into shareable proofs immediately after a job,
    before anyone has time to sit down and edit.
  - Producing a lightweight contact set for a client to pick selects from,
    keeping the RAW files for the ones they choose.
  - Making an archive of viewable images alongside RAW originals that most
    software will not open in a decade.
macOSAlternative:
  method: Preview, or sips
  detail:
    Preview opens most camera RAW files and can export a selection to JPEG,
    using the same ImageIO decoding. `sips -s format jpeg shot.cr3 --out
    shot.jpg` works from Terminal and is scriptable.
  breaksDownWhen:
    You want the export capped to a delivery width, need to see at a glance
    which of 400 frames failed to decode, or have a card with RAW, HEIC and JPEG
    mixed together that should all end up as one consistent set.
related:
  - heic-to-jpg
  - tiff-to-jpg
  - psd-to-png
---

## A RAW file is not an image yet

This is the part that surprises people. `IMG_0421.CR3` is not a compressed
photograph — it is a nearly-unprocessed dump of what the sensor measured, plus
metadata about the camera's settings at the time.

Every photosite on the sensor sits behind a colour filter and records exactly
one of red, green or blue. Producing a normal image means **demosaicing**:
guessing each pixel's other two channels from its neighbours. Then something has
to decide white balance, contrast, saturation and sharpening.

None of those decisions are in the file. They are made by whatever software
opens it, which is precisely why the same RAW looks different in Lightroom, in
Capture One, and in Preview.

## What "converted by macOS" means for the look

PixelFerry hands RAW decoding to **macOS ImageIO**, the same system component
Preview and Finder use. That has real consequences worth stating plainly:

- The result is **neutral and consistent**, not a manufacturer's picture-style
  interpretation and not an opinionated raw developer's default.
- It matches what you already see in Finder and Preview, so there are no
  surprises between the thumbnail and the output.
- It is **not** what your editing software would produce. If you have a
  developed look you care about, export from that software and convert the
  export.

Because ImageIO is doing the work, this path is macOS-only. There is no bundled
cross-platform RAW decoder, and rather than pretend otherwise, the app says so.

## Formats that go through this path

Canon `CR2` and `CR3`, Nikon `NEF`, Sony `ARW`, Fujifilm `RAF`, Olympus `ORF`,
Panasonic `RW2` and Adobe `DNG`, plus the others ImageIO knows about. The same
route also handles `EXR` and `HDR`, where ImageIO tone-maps high dynamic range
down to something a JPEG can represent.

## The batch, in practice

Point PixelFerry at the card or the import folder. It walks subfolders, so a
`DCIM` tree with several dated directories comes in as one queue.

Set JPG as the output, pick a quality — 85 is a reasonable proof default — and
set a width if these are going somewhere with a size limit. Four files convert
at a time.

Where this beats exporting from Preview is failure reporting. On a batch of
several hundred, some frames will occasionally be unreadable — a card write that
went wrong, a truncated transfer. PixelFerry marks those rows individually with
an error and a retry, rather than silently ending up with 397 files where you
expected 400. When a decode fails but the file itself is readable, it will
salvage the embedded EXIF preview and flag the result as degraded, so a
thumbnail can never quietly masquerade as a real conversion.
