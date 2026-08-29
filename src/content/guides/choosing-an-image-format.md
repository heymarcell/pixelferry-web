---
title: JPEG, PNG, WebP or AVIF — choosing an image format that holds up
description:
  A practical comparison of the four formats that matter for delivery, plus HEIC
  and TIFF for capture. What each is good at, what it costs, and how to decide.
heading: JPEG, PNG, WebP or AVIF — which format, and why
published: 2026-08-29
updated: 2026-08-29
summary:
  There are only a handful of image formats worth using and each one has a clear
  job. This is what separates them technically, and a decision procedure that
  gets you to the right answer in about thirty seconds.
takeaways:
  - Photographs go to AVIF or WebP for the web, JPEG when it has to open
    anywhere.
  - Anything with sharp edges or flat colour — screenshots, logos, diagrams —
    belongs in a lossless format, and WebP lossless beats PNG at that job.
  - Transparency rules out JPEG entirely, and lossy WebP is the only way to have
    both alpha and small files.
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

**Capture and archive** — HEIC, camera RAW, TIFF, PSD. These keep as much
information as possible: high bit depth, editing headroom, layers, colour
profiles. They are large, and outside their own ecosystems they are badly
supported. That is a reasonable trade for a master file.

**Delivery** — JPEG, PNG, WebP, AVIF, GIF. These are optimised to be small and
to open everywhere. They discard what a viewer will not notice.

The mistakes almost always come from crossing the streams: archiving JPEGs, or
trying to put a 60 MB TIFF into an email.

## The delivery four, compared

### JPEG

The universal default, and the reason is compatibility rather than quality.
Every piece of software written in the last thirty years reads it.

- **Lossy only.** No transparency, 8-bit only.
- Compresses photographs well and everything else badly. Sharp edges get visible
  ringing, which is why screenshots saved as JPEG look wrong.
- Degrades on every re-save. Never use it as a working format.

**Use it when:** the file has to open somewhere you do not control.

### PNG

The lossless default. Every pixel exact, real alpha channel.

- Excellent on flat colour, text and line art — the DEFLATE compression finds
  the repetition.
- Poor on photographs, where there is no repetition to find. Expect ten to
  twenty times the size of an equivalent JPEG.
- Still the safest transparent format for compatibility.

**Use it when:** you need transparency or exactness and cannot rely on WebP.

### WebP

The one that quietly replaced both of the above for web use.

- **Two modes.** Lossy beats JPEG by roughly 25–35% at matched quality. Lossless
  beats PNG by roughly 25% with identical pixels.
- **Alpha in both modes** — the only common format that offers lossy compression
  _and_ transparency.
- Supported in every current browser. Thinner support outside them.

**Use it when:** it is going on a web page. This is the sensible default now.

### AVIF

The most efficient, and the slowest to make.

- 40–50% smaller than JPEG, 15–20% smaller than WebP, at comparable quality.
- Markedly better on smooth gradients — skies band far less.
- Handles 10- and 12-bit and wide gamut natively.
- Encoding is several times slower than WebP. Support outside browsers is poor.

**Use it when:** the image is large, the bytes matter, and you can serve a
fallback.

## The decision, in order

1. **Does it need transparency?** Yes → WebP (lossy if photographic, lossless if
   flat), or PNG if compatibility is uncertain. Never JPEG.

2. **Is it a photograph, or does it have sharp edges and flat colour?** Sharp
   edges → lossless. WebP lossless first, PNG as the fallback. Photograph →
   continue.

3. **Is this for a web page you control?** Yes → AVIF with a WebP fallback, or
   WebP alone if you want one tier and less complexity. No → JPEG at quality
   85–90.

4. **Is it an archive master?** Then none of the above. Keep the RAW, TIFF or
   PSD.

## Quality numbers are not comparable

A recurring mistake: assuming "quality 80" means the same thing everywhere. It
does not, and the scales are not even close.

- **JPEG 85** — the standard high-quality setting.
- **WebP 80** — roughly equivalent perceptually, meaningfully smaller.
- **AVIF 60–65** — roughly equivalent perceptually, smaller again.

Setting AVIF to 85 out of habit produces a file barely smaller than the JPEG and
a much longer encode.

## About capture formats

**HEIC** is what an iPhone shoots. Efficient, often 10-bit, and unreadable in a
great deal of software — which is why
[converting it to JPG](/convert/heic-to-jpg) is such a common task.

**Camera RAW** is not an image at all until something demosaics it, and
different software produces different results from the same file. See
[RAW to JPG](/convert/raw-to-jpg) for what that means in practice.

**TIFF** is the archive workhorse: lossless, 16-bit capable, CMYK capable, and
enormous. Keep it as the master and
[convert copies for delivery](/convert/tiff-to-jpg).

## Practical rules

- Keep the highest-quality original you have. Every delivery format is a
  generated artefact you can regenerate.
- Never convert lossy → lossy repeatedly. Each pass compounds.
- Resize before worrying about the codec. Serving a 4000px image into a 1200px
  column wastes more bytes than any format choice recovers.
- Match the format to the content, not to the habit.
