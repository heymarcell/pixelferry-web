---
title: Convert HEIC to JPG on Mac — batch, offline, originals kept
description:
  HEIC is what your iPhone shoots; JPG is what everything else opens. What the
  conversion costs, what macOS already does for free, and how to batch a whole
  library.
heading: Convert HEIC to JPG on a Mac
from: HEIC
to: JPG
published: 2026-08-29
updated: 2026-08-29
summary:
  HEIC stores an iPhone photo in roughly half the space of the equivalent JPEG,
  and almost nothing outside Apple's ecosystem reads it. Converting to JPG
  trades that efficiency for near-universal compatibility.
whatChanges:
  - label: The codec underneath
    detail:
      HEIC wraps HEVC-compressed image data in an HEIF container. JPG uses the
      much older DCT-based JPEG codec, which is why the same picture at visually
      comparable quality lands roughly twice the size.
  - label: Bit depth
    detail:
      iPhone HEIC files are frequently 10-bit per channel. JPEG is 8-bit only,
      so the conversion quantises the tonal range. You will not notice it on a
      normal photo; you may notice it in a wide, smooth gradient like a clear
      sky.
  - label: Live Photos and depth data
    detail:
      A Live Photo is a HEIC still plus a separate video file, and portrait
      shots carry a depth map. Converting the still gives you the still — the
      motion and the depth channel are not part of a JPEG and do not survive.
  - label: Colour profile
    detail:
      Recent iPhones tag photos as Display P3, which is wider than sRGB. The ICC
      profile is carried across, so the JPEG stays P3-tagged and colour-managed
      apps keep showing the same colours.
limitations:
  - PixelFerry reads HEIC but never writes it, so this conversion is one-way.
    Keep your originals if you might want the smaller files back.
  - Live Photo motion and portrait depth maps are discarded, because JPEG has
    nowhere to put them.
  - JPEG is lossy and generational. Re-encoding an already-converted JPEG at a
    lower quality compounds artefacts; convert from the HEIC original each time
    instead.
useCases:
  - Sending a set of iPhone photos to someone on Windows, or to a client whose
    review tool silently rejects HEIC uploads.
  - Preparing images for an older CMS, print portal, or job application form
    that only accepts JPEG.
  - Archiving a shared album into a format you can still open in fifteen years
    without an Apple device.
macOSAlternative:
  method: Preview, the Finder Quick Action, or the sips command
  detail:
    Select the files in Finder, right-click, and use Convert Image — macOS has
    shipped that Quick Action since Monterey. Preview can also export a
    multi-selection via File → Export Selected Images, and `sips -s format jpeg
    photo.heic --out photo.jpg` does it from Terminal.
  breaksDownWhen:
    You need the same pass to also resize, cap quality, or handle a folder that
    has RAW and PSD files mixed in with the HEICs — the Quick Action offers
    three formats and one size setting, and gives you no per-file result.
related:
  - heic-to-png
  - jpg-to-webp
  - raw-to-jpg
---

## Why an iPhone photo will not open

Since iOS 11, an iPhone set to **High Efficiency** saves stills as `.heic`. The
picture inside is compressed with HEVC — the same codec family as H.265 video —
which is dramatically better at its job than the JPEG codec from 1992. A typical
12-megapixel shot lands around 1.5 MB instead of 3 MB.

The catch is reach. macOS, iOS and modern Windows read HEIC; a great deal of
other software does not, and the failure is rarely graceful. Upload forms reject
the file type, older editors show nothing, and some tools accept the upload and
then produce a broken thumbnail.

Converting to JPG is how you stop thinking about it.

## What you give up, precisely

The conversion is lossy in two separate ways, and it is worth knowing which is
which.

The first is **re-encoding**. The HEIC is decoded to pixels and those pixels are
re-compressed as JPEG. At quality 85 or above this is invisible on ordinary
photographic content. Below about 70 you will start to see it in flat areas and
around hard edges.

The second is **structural**. A JPEG has no alpha channel, no depth map, no
auxiliary image, and no second frame. Anything the HEIC carried alongside the
main picture simply has nowhere to go.

## How PixelFerry handles it

PixelFerry decodes HEIC through the macOS system codec rather than a bundled
JavaScript decoder. That path runs out of process and is roughly seven times
faster, which is the difference between a coffee break and a progress bar when
you point it at a few hundred photos.

From there the batch runs four files at a time:

1. **EXIF orientation is applied** to the pixels, so a photo shot in portrait
   arrives upright rather than relying on a rotation flag the destination might
   ignore.
2. **Resize, if you asked for one** — by width, by height, to exact dimensions
   with crop, fit or fill, or by percentage.
3. **Encode as JPEG** using mozjpeg at your chosen quality, with progressive
   encoding available.

Transparency is flattened onto **white**, not the black that most image
libraries default to. That only matters if you feed it a PNG in the same batch,
but it is the behaviour you want when you do.

Originals are never touched, and output never overwrites an existing file — a
name collision gets a `_converted` suffix rather than silently replacing
something.

## Keep or strip the metadata

Turning on metadata removal drops EXIF, XMP and IPTC. That is the camera model,
the capture settings, the editing history and — the one people actually care
about — the GPS coordinates.

It deliberately **keeps the ICC colour profile**. Those two are stored in the
same metadata block, so the naive implementation throws away colour management
along with the location data, and a Display P3 photo comes out untagged for
every downstream tool to guess at. Asking to remove your location should not
quietly reinterpret your colours.
