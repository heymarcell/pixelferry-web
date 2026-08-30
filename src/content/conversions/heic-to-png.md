---
title: Convert HEIC to PNG on Mac without re-compressing twice
description:
  PNG's compression is lossless, but PixelFerry writes 8-bit PNG — so a 10-bit
  HEIC is quantised on the way through, and the files get much larger. When that
  trade is right.
heading: Convert HEIC to PNG on a Mac
from: HEIC
to: PNG
published: 2026-08-29
updated: 2026-08-29
summary:
  PNG adds no compression artefacts of its own, but PixelFerry writes 8-bit PNG,
  so a 10-bit HEIC is quantised. It also produces much larger files, which makes
  this the right conversion for editing and the wrong one for sharing.
whatChanges:
  - label: Compression model
    detail:
      HEIC is lossy and PNG's own compression is lossless, so the conversion
      adds no new compression artefacts. It is not loss-free end to end, though
      — an 8-bit HEIC comes through pixel-for-pixel, while a 10-bit one is
      quantised to 8 bits (see below). Neither case can undo the loss the camera
      baked in.
  - label: File size, upward
    detail:
      Expect the PNG to be much larger than the HEIC. No published corpus fixes
      the ratio and this site does not invent one — it depends heavily on the
      photograph. PNG's DEFLATE compression is built for flat colour and sharp
      edges, and photographic noise is close to worst case for it — so the exact
      ratio depends heavily on the photograph.
  - label: Alpha channel
    detail:
      PNG supports real per-pixel transparency, but a camera HEIC has none to
      carry over and PixelFerry does not add one — measured, a photographic HEIC
      decodes to three channels and the PNG comes out with three. If you need an
      alpha channel for a compositing step, it has to come from the source.
  - label: Bit depth handling
    detail:
      PixelFerry writes 8-bit PNG. A 10-bit HEIC is quantised on the way
      through, exactly as it would be for JPEG, so PNG does not preserve the
      extra tonal precision an iPhone captured.
limitations:
  - The output is genuinely large. Converting a folder of iPhone photos to PNG
    needs meaningfully more disk than the originals did — check the destination
    has room before starting a big batch.
  - PNG is lossless but not magic — it cannot recover detail the HEIC encoder
    already discarded.
  - PixelFerry writes 8-bit PNG, so this is not a route for preserving 10-bit
    HDR stills.
useCases:
  - Handing a photo to a designer or a compositing step where any further
    generational loss is unacceptable.
  - Feeding images into a tool that will not read HEIC and where you would
    rather not introduce a second lossy pass before editing.
  - Producing a screenshot-quality asset from an iPhone capture that will be
    annotated and re-saved several times.
macOSAlternative:
  method: The Finder Convert Image Quick Action
  detail:
    Right-clicking a selection in Finder and choosing Convert Image offers PNG
    alongside JPEG and HEIF, and it will happily do a large selection in place.
    For a handful of files it is usually the simplest built-in route.
  breaksDownWhen:
    You need to resize in the same pass, want the results in a separate folder
    rather than beside the originals, or need to know which specific file failed
    in a batch of hundreds.
related:
  - heic-to-jpg
  - png-to-webp
  - psd-to-png
---

## PNG is the "stop losing quality here" format

Every time a lossy image is decoded, edited and re-saved, it loses a little
more. That is generational loss, and it is why a meme that has been through
fifteen phones looks the way it does.

Converting HEIC to PNG draws a line under that: from the PNG onward, a save that
stays lossless reproduces the pixels exactly. Re-export it as a JPEG and you are
back to generational loss — the PNG protects you from the compounding, not from
the next lossy encode.

Two things it does not do. It cannot undo the loss the HEIC already baked in,
and it does not carry more than 8 bits per channel through, because PixelFerry
writes 8-bit PNG — so a 10-bit capture is quantised once, at this step.

What it is not is a way to make the image better. A lossless container around a
lossy image is still a lossy image. If you are converting purely so the file
opens somewhere,
[JPG is the smaller and more sensible target](/convert/heic-to-jpg).

## The size problem, concretely

PNG compresses with DEFLATE, which finds runs and repeated patterns.
Screenshots, logos and flat illustration compress beautifully. Photographs —
where adjacent pixels differ by small random amounts because of sensor noise —
barely compress at all.

A 12-megapixel photo is roughly 12 million pixels × 3 bytes before compression,
and DEFLATE has little repetition to exploit in photographic noise. A PNG of
photographic content can be much larger than the HEIC it came from, and that is
normal rather than a sign anything went wrong. No published corpus fixes the
ratio — it depends heavily on the image.

If the destination can read them, [WebP](/convert/png-to-webp) in lossless mode
reproduces that same 8-bit result exactly, and is usually smaller — see that
page for Google's published figures and their baselines.

## Running a batch

Drop the HEICs — or the whole folder — onto the window, set the output format to
PNG, and pick a destination. There is no quality slider for PNG, because there
is no quality decision to make; PixelFerry writes at maximum compression
(`compressionLevel: 9`), which is slower to encode and smaller on disk, and
identical in output.

Resize is where this conversion usually earns its keep. Converting a
12-megapixel HEIC to a full-resolution PNG and then scaling it down in another
tool means writing a very large intermediate to disk for no reason. Setting the
target width in the same pass skips that entirely.

The queue mixes freely. HEICs from a phone, RAW files from a camera and PSDs
from a designer can all sit in the same batch and come out as PNGs with one set
of rules applied to all of them — at an exact width, into a folder you choose,
with a per-file result. The Finder Quick Action converts a selection too, but
its sizing is four named presets, it has no quality control, and it writes
beside the originals.
