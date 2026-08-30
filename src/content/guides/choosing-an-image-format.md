---
title: 'JPEG, PNG, WebP or AVIF: choosing an image format that holds up'
description:
  A practical comparison of the four formats that matter for delivery, plus HEIC
  and TIFF for capture. What each is good at, what it costs, and how to decide.
heading: 'JPEG, PNG, WebP or AVIF: which format, and why'
published: 2026-08-29
updated: 2026-08-29
summary:
  There are only a handful of image formats worth using and each one has a clear
  job. This is what separates them technically, and a decision procedure that
  gets you to the right answer in about thirty seconds.
takeaways:
  - Photographs go to AVIF or WebP for the web, JPEG when it has to open
    anywhere.
  - Anything with sharp edges or flat colour (screenshots, logos, diagrams)
    belongs in a lossless format. WebP lossless is usually smaller than PNG, but
    not on every file.
  - Transparency rules out JPEG entirely. WebP and AVIF both keep an alpha
    channel while compressing the colour lossily, which is what makes cut-outs
    small.
  - Capture and archive formats (HEIC, RAW, TIFF) are not delivery formats, and
    converting between the two roles is where most mistakes happen.
relatedConversions:
  - jpg-to-webp
  - jpg-to-avif
  - png-to-webp
  - heic-to-jpg
---

Most format confusion comes from treating one list as if it answered two
different questions. **Capture and archive** formats and **delivery** formats
are solving opposite problems, and a format that is excellent at one is usually
bad at the other.

## The two jobs

**Capture and archive**: HEIC, camera RAW, TIFF, PSD. These keep as much
information as possible: high bit depth, editing headroom, layers, colour
profiles. They are large, and outside their own ecosystems they are badly
supported. That is a reasonable trade for a master file.

**Delivery**: JPEG, PNG, WebP, AVIF, GIF. These are optimised to be small and
widely readable. The lossy ones among them (JPEG, and WebP or AVIF in lossy
mode) work by discarding detail. PNG and lossless WebP discard nothing and get
their size from better compression alone.

The mistakes almost always come from crossing the streams: archiving JPEGs, or
emailing a full-resolution scanner TIFF.

## The delivery four, compared

### JPEG

The default almost everywhere, and the reason is compatibility rather than
quality. The standard dates to 1992 and support for it is about as broad as an
image format gets.

- **Lossy, no transparency, 8-bit** in the baseline form everything actually
  uses. The spec also defines 12-bit and lossless modes, but they are rare and
  PixelFerry does not write them.
- Compresses photographs well and everything else badly. Sharp edges get visible
  ringing, which is why screenshots saved as JPEG look wrong.
- Degrades on every re-save, so it is a poor choice as a working format. Keep an
  unedited original and re-export from that.

**Use it when:** the file has to open somewhere you do not control.

### PNG

The lossless default. Every pixel exact, real alpha channel.

- Excellent on flat colour, text and line art, where the DEFLATE compression
  finds the repetition.
- Poor on photographs, where there is no repetition to find. A photographic PNG
  is typically much larger than the same image saved as a JPEG, by a margin that
  depends heavily on the image.
- Still the safest transparent format for compatibility.

**Use it when:** you need transparency or exactness and cannot rely on WebP.

### WebP

The one that quietly replaced both of the above for web use.

- **Two modes.** Google's WebP study measures lossy WebP 25–34% smaller than
  JPEG at matched SSIM, against a libjpeg 6b baseline. PixelFerry encodes JPEG
  with mozjpeg, which is stronger, so expect less than that against its own
  output. For lossless, Google publishes 26% smaller than PNG, and its lossless
  study measures 23% against a ZopfliPNG-optimised baseline. All are corpus
  averages; individual files vary, and Google documents cases where WebP comes
  out larger.
- **Transparency with lossy colour**, which PNG (always lossless) and JPEG (no
  alpha) cannot offer. AVIF can do this too.
- Supported in every current major browser. Thinner support outside them.

**Use it when:** it is going on a web page. This is the sensible default now.

### AVIF

The newest codec of these four, and the one with the most modern machinery: AV1
intra coding, with larger and variable block sizes and more prediction modes
than JPEG's fixed 8x8 DCT. It is slow to encode, and PixelFerry leaves the
encoder's speed setting at its default, which is what that time depends on.

- That machinery is why AVIF is worth trying on large photographs. Whether it
  actually wins on a given file, and by how much, depends on the image and on
  both encoders' settings. This site publishes no general ranking, and its own
  measurement includes a noisy source where AVIF came out larger than WebP.
- Designed to handle smooth gradients better than JPEG's 8x8 DCT, which is where
  banding shows first. Whether it is visible depends on the image and the
  setting, so compare a sample.
- The format handles 10- and 12-bit and wide gamut natively, and supports alpha
  with lossy colour. PixelFerry writes 8-bit AVIF, though, so that depth is the
  format's headroom rather than something this app can put in the file.
- Encoding is the slow part: on PixelFerry's encoder, AVIF at quality 80 took
  roughly 2.5–3.5x as long as WebP and 3–5x as long as mozjpeg on a synthetic 12
  MP photographic source, on one machine across repeat runs. The multiple moves
  with the source and the libvips build. Support outside browsers is thin.

**Use it when:** the image is large, the bytes matter, and you can serve a
fallback.

## The decision, in order

1. **Does it need transparency?** Yes → WebP or AVIF (lossy if photographic,
   lossless if flat), or PNG if compatibility is uncertain. Never JPEG.

2. **Is it a photograph, or does it have sharp edges and flat colour?** Sharp
   edges → lossless. WebP lossless first, PNG as the fallback. Photograph →
   continue.

3. **Is this for a web page you control?** Yes → AVIF with a WebP fallback, or
   WebP alone if you want one tier and less complexity. No → JPEG, starting at
   the app's default of 80 and adjusted after looking at the result.

4. **Is it an archive master?** Then none of the above. Keep the RAW, TIFF or
   PSD.

## Quality numbers are not comparable

A recurring mistake: assuming "quality 80" means the same thing everywhere. It
does not. A quality value is a control on one specific encoder, not a unit, so
there is no conversion table between JPEG's scale, WebP's and AVIF's, and any
page offering one is guessing.

That cuts both ways: a number carried over from JPEG can land too high or too
low on another encoder. There is no direction of travel to assume, so read the
output instead.

The method is the same for all of them. PixelFerry starts every lossy codec at
quality 80. Convert a representative handful at that, read the per-row
before/after sizes, look at the results at the size they will actually be
viewed, then move the number. That beats any table, including one this page
could give you.

## About capture formats

**HEIC** is what an iPhone shoots in High Efficiency mode. Efficient, often
10-bit, and well supported on current Apple and Windows systems but patchy
outside them, which is why [converting it to JPG](/convert/heic-to-jpg) is such
a common task.

**Camera RAW** is not a finished rendered image. It holds largely unprocessed
sensor readings that have to be demosaiced and interpreted first, and different
software produces different results from the same file. See
[RAW to JPG](/convert/raw-to-jpg) for what that means in practice.

**TIFF** is what print and imaging workflows keep masters in: a container that
is usually lossless (it can hold JPEG-compressed data too), 16-bit capable, CMYK
capable, and enormous. Keep the 16-bit original as the master. PixelFerry reads
it but writes 8-bit LZW TIFF, like everything else it outputs. Then
[convert copies for delivery](/convert/tiff-to-jpg).

## Practical rules

- Keep the highest-quality original you have. Every delivery format is a
  generated artefact you can regenerate.
- Never convert lossy → lossy repeatedly. Each pass compounds.
- Resize before worrying about the codec. When an image is served at several
  times the dimensions it is displayed at, cutting the dimensions is usually the
  larger saving of the two, and the one you can check in a minute.
- Match the format to the content, not to the habit.
