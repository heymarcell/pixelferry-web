---
title: Convert camera RAW to JPG on Mac without uploading anything
description:
  CR3, NEF, ARW, RAF and DNG hold unprocessed sensor readings, not finished
  images. What demosaicing does, why macOS looks different from Lightroom, and
  how to batch a card.
heading: Convert camera RAW to JPG on a Mac
from: RAW
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  A RAW file holds largely unprocessed sensor readings that have to be
  interpreted before they become a viewable image. macOS does that
  interpretation with ImageIO — consistently, and entirely on your machine.
whatChanges:
  - label: Demosaicing
    detail:
      Each photosite sits behind one colour of a filter array, so the file holds
      a single measured value per photosite rather than three. Producing a
      full-colour image means interpolating the two missing values for every
      pixel. This is the step that turns sensor readings into a picture, and
      different software does it differently.
  - label: The rendering decisions
    detail:
      White balance, tone curve, colour rendering and sharpening are not stored
      as pixels in a RAW file — they are choices. macOS ImageIO applies Apple's
      own interpretation, which is why the result looks different from
      Lightroom's or Capture One's default. Different, not more correct.
  - label: Editing latitude
    detail:
      RAW files typically store 12 or 14 bits per photosite reading, against
      JPEG's 8 bits per channel. That extra precision is what lets you lift
      shadows or pull back highlights that are dim or bright but still measured,
      without banding. It cannot recover anything that actually clipped — a
      genuinely blown highlight holds no data at any bit depth. Make those
      adjustments before converting, not after.
  - label: File size
    detail:
      The JPEG will generally be smaller than the RAW — it stores an 8-bit
      rendered result rather than the full-precision sensor readings plus the
      editing headroom you are no longer going to use. The ratio depends on the
      camera, the scene and the quality you pick, so read the per-row figures
      rather than expecting a fixed multiple.
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
  - Making an archive of viewable images alongside RAW originals, since a
    proprietary RAW format depends on its vendor's decoder remaining available.
macOSAlternative:
  method: Preview, or sips
  detail:
    Preview opens most camera RAW files and can export a selection to JPEG,
    using the same ImageIO decoding. `sips -s format jpeg shot.cr3 --out
    shot.jpg` works from Terminal and is scriptable.
  breaksDownWhen:
    You want the export capped to a delivery width, need to see at a glance
    which frames on a full card failed to decode, or have a card with RAW, HEIC
    and JPEG mixed together that should all end up as one consistent set.
related:
  - heic-to-jpg
  - tiff-to-jpg
  - psd-to-png
---

## A RAW file is not a finished image yet

This is the part that surprises people. `IMG_0421.CR3` is not a compressed
photograph — it is a largely unprocessed record of what the sensor measured,
plus metadata about the camera's settings at the time. (Most RAW files do carry
an embedded JPEG preview, which is what your camera's screen and Finder's
thumbnail are showing you.)

Each photosite sits behind one colour of a filter array and contributes a single
measured value, not a red-green-blue triple. Producing a normal image means
**demosaicing**: interpolating the two missing values for every pixel from its
neighbours. Then something has to decide white balance, contrast, saturation and
sharpening.

The file usually records what the camera was set to — white balance as shot,
picture style, lens corrections — as metadata. What it does not contain is those
choices baked into finished RGB pixels the way a delivered JPEG does. Software
opening the RAW may honour that metadata, ignore it, or substitute its own
defaults, which is precisely why the same RAW looks different in Lightroom, in
Capture One, and in Preview.

## What "converted by macOS" means for the look

PixelFerry hands RAW decoding to **macOS ImageIO**, the same system component
Preview and Finder use. That has real consequences worth stating plainly:

- The result is **consistent** — the same interpretation every time, and the
  same one Finder and Preview show you. It is Apple's rendering, which is a
  choice like any other, not an absence of one.
- It is close to what Finder and Preview show you, because those come from the
  same ImageIO rendering — though not identical to the camera's own embedded
  preview, which has the picture style baked in.
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

Set JPG as the output, pick a quality — the app's default of 80 is the place to
start — and set a width if these are going somewhere with a size limit. Four
files convert at a time.

Where this beats exporting from Preview is failure reporting. A card write that
went wrong or a truncated transfer leaves a file that will not decode, and on a
large card you will not spot it by eye. PixelFerry marks those rows individually
with an error and a retry, rather than leaving you to notice that the output
folder holds fewer files than the card did. When a decode fails but the file
itself is readable, it will salvage the embedded EXIF preview and flag the
result as degraded, so a thumbnail can never quietly masquerade as a real
conversion.
