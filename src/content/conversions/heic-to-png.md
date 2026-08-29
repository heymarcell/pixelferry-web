---
title: Convert HEIC to PNG on Mac without re-compressing twice
description:
  PNG is lossless, so converting HEIC to PNG adds no new quality loss — and
  makes the files several times larger. When that trade is right, and when JPG
  is the better answer.
heading: Convert HEIC to PNG on a Mac
from: HEIC
to: PNG
published: 2026-08-29
updated: 2026-08-29
summary:
  PNG stores every pixel exactly, so a HEIC converted to PNG picks up no new
  compression artefacts. It also produces files several times larger than the
  source, which makes this the right conversion for editing and the wrong one
  for sharing.
whatChanges:
  - label: Compression model
    detail:
      HEIC is lossy and PNG is lossless. The decode already happened, so the
      conversion adds no further loss — but it cannot undo the loss the HEIC
      already baked in. You get a perfect copy of an imperfect image.
  - label: File size, upward
    detail:
      A 1.5 MB HEIC commonly becomes a 10–25 MB PNG. PNG's DEFLATE compression
      is designed for flat colour and sharp edges, and photographic noise is
      close to worst case for it.
  - label: Alpha channel
    detail:
      PNG has real per-pixel transparency. A camera HEIC has none to carry over,
      so the result is fully opaque — but the channel exists, which matters if
      the PNG is going straight into a compositing step.
  - label: Bit depth handling
    detail:
      PixelFerry writes 8-bit PNG. A 10-bit HEIC is quantised on the way
      through, exactly as it would be for JPEG, so PNG does not preserve the
      extra tonal precision an iPhone captured.
limitations:
  - The output is genuinely large. A folder of a few hundred iPhone photos
    converted to PNG will run into gigabytes.
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
    It is genuinely the fastest way to convert a handful of files.
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

Converting HEIC to PNG draws a line under that. The HEIC's existing loss is
permanent — it happened in the camera — but from the PNG onward, every save is
exact.

What it is not is a way to make the image better. A lossless container around a
lossy image is still a lossy image. If you are converting purely so the file
opens somewhere,
[JPG is the smaller and more sensible target](/convert/heic-to-jpg).

## The size problem, concretely

PNG compresses with DEFLATE, which finds runs and repeated patterns.
Screenshots, logos and flat illustration compress beautifully. Photographs —
where adjacent pixels differ by small random amounts because of sensor noise —
barely compress at all.

So a 12-megapixel photo is roughly 12 million pixels × 3 bytes, and DEFLATE
takes perhaps a third off. Ten to twenty-five megabytes per image is normal, and
it is not a sign anything went wrong.

If the destination can read them, [WebP](/convert/png-to-webp) in lossless mode
gives you the same pixel-exact guarantee at a substantially smaller size.

## Running a batch

Drop the HEICs — or the whole folder — onto the window, set the output format to
PNG, and pick a destination. There is no quality slider for PNG, because there
is no quality decision to make; PixelFerry writes at maximum compression
(`compressionLevel: 9`), which is slower to encode and smaller on disk, and
identical in output.

Resize is where this conversion usually earns its keep. Converting a
12-megapixel HEIC to a full-resolution PNG and then scaling it down in another
tool means writing 20 MB to disk for no reason. Setting the target width in the
same pass skips that entirely.

The queue mixes freely. HEICs from a phone, RAW files from a camera and PSDs
from a designer can all sit in the same batch and come out as PNGs with one set
of rules applied to all of them — which is the thing the Finder Quick Action
cannot do at all.
