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
  HEIC uses HEVC intra coding, a generation ahead of JPEG's, and support for it
  is good on current Apple and Windows systems but patchy everywhere else.
  Converting to JPG trades that efficiency for near-universal compatibility.
whatChanges:
  - label: The codec underneath
    detail:
      HEIC wraps HEVC-compressed image data in an HEIF container. JPG uses the
      much older DCT-based JPEG codec, so a JPEG at visually comparable quality
      is usually the larger file. How much larger depends on the image and on
      the quality you choose, so read the per-row figures rather than expecting
      a fixed ratio.
  - label: Bit depth
    detail:
      HEIC can store more than 8 bits per channel, and iPhone HEIC often does —
      and iPhone HDR captures are the common case. Baseline JPEG is 8-bit, so
      where the source carried more precision the conversion quantises it. You
      are unlikely to notice on a normal photo; a wide, smooth gradient like a
      clear sky is where it shows.
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
  - Converting is lossy in both directions, so keep the HEIC originals. (On
    macOS PixelFerry can write HEIC as well as read it — but re-encoding a JPEG
    back to HEIC compounds loss rather than undoing it.)
  - Live Photo motion and portrait depth maps are discarded, because JPEG has
    nowhere to put them.
  - JPEG is lossy and generational. Re-encoding an already-converted JPEG at a
    lower quality compounds artefacts; convert from the HEIC original each time
    instead.
useCases:
  - Sending a set of iPhone photos to a client whose review tool or upload form
    silently rejects HEIC.
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
    three formats and four named size presets, and gives you no per-file result.
related:
  - heic-to-png
  - jpg-to-webp
  - raw-to-jpg
---

## Why an iPhone photo will not open

Since iOS 11, an iPhone set to **High Efficiency** saves stills as `.heic`. The
picture inside is compressed with HEVC — the same codec family as H.265 video —
which is considerably better at its job than the JPEG codec from 1992, which is
the whole reason Apple switched.

The catch is reach, and it is narrower than JPEG's. macOS, iOS and current
Windows all read HEIC, and many mainstream editors now do too. What still trips
people up is everything else: upload forms with a fixed allow-list, older
software, some content management systems and print portals.

On the web specifically, support is real but narrow. Safari has displayed HEIC
in `<img>` and `<picture>` since version 17, and WKWebView with it. Outside
WebKit it is limited — the HEVC patent licensing behind HEIC is the reason
usually given — so JPEG, WebP and AVIF remain the safe choices for a page you do
not control. The failure is rarely graceful either way; a form rejects the type,
or accepts it and produces a broken thumbnail.

Converting to JPG is how you stop thinking about it.

## What you give up, precisely

The conversion is lossy in two separate ways, and it is worth knowing which is
which.

The first is **re-encoding**. The HEIC is decoded to pixels and those pixels are
re-compressed as JPEG. How visible that is depends on the photograph and on the
quality you choose — flat areas and hard edges show it first. Convert a few at
the app's default of 80, look at them at the size they will be viewed, and move
the number from there.

The second is **structural**. A JPEG has no alpha channel, no depth map, no
auxiliary image, and no second frame. Anything the HEIC carried alongside the
main picture simply has nowhere to go.

## How PixelFerry handles it

PixelFerry decodes HEIC through the macOS system codec rather than a bundled
JavaScript decoder. The hardware path is several times faster — which is the
difference between a coffee break and a progress bar when you point it at a few
hundred photos.

From there the batch runs four files at a time:

1. **EXIF orientation is applied** to the pixels, so a photo shot in portrait
   arrives upright rather than relying on a rotation flag the destination might
   ignore.
2. **Resize, if you asked for one** — by width, by height, to exact dimensions
   with crop, fit or fill, or by percentage.
3. **Encode as JPEG** using mozjpeg at your chosen quality, with progressive
   encoding available.

Transparency is flattened onto **white**, not the black the underlying encoder
would default to. That applies to every alpha-bearing source in the batch — PNG,
WebP, PSD, TIFF, GIF, and HEIC itself, which can carry alpha — and it is the
behaviour you want when it happens.

Originals are never touched, and output never overwrites an existing file — a
name collision gets a `_converted` suffix rather than silently replacing
something.

## Keep or strip the metadata

Metadata removal is **on by default**, and it drops EXIF, XMP and IPTC. That is
the camera model, the capture settings, the editing history and — the one people
actually care about — the GPS coordinates. Turn it off if you want them kept.

It deliberately **keeps the ICC colour profile**. Those two are stored in the
same metadata block, so the naive implementation throws away colour management
along with the location data, and a Display P3 photo comes out untagged for
every downstream tool to guess at. Asking to remove your location should not
quietly reinterpret your colours.
