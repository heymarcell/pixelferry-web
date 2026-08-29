---
title: Convert JPG to WebP on Mac — smaller files, same page
description:
  Google measures WebP 25–34% smaller than JPEG at matched SSIM. Why re-encoding
  an existing JPEG is not free, and how to convert a directory in one pass.
heading: Convert JPG to WebP on a Mac
from: JPG
to: WebP
published: 2026-08-29
updated: 2026-08-29
summary:
  WebP compresses noticeably better than JPEG at the same perceived quality,
  which makes it the standard choice for web delivery. Converting existing JPEGs
  is a second lossy pass, so quality choice matters more than usual.
whatChanges:
  - label: A second lossy generation
    detail:
      The JPEG is decoded to pixels — artefacts and all — and re-encoded with a
      different lossy codec. WebP now has to spend bits describing JPEG's block
      artefacts as if they were image detail, which is why converting at low
      quality compounds badly.
  - label: Compression efficiency
    detail:
      WebP's VP8-derived intra coding uses better prediction and a smarter
      transform than JPEG's. Google's own WebP study measured files 25–34%
      smaller than JPEG at the same SSIM across four image sets — an average per
      corpus, not a promise for any one photograph.
  - label: An alpha channel becomes available
    detail:
      WebP supports transparency, which JPEG does not. Nothing to carry over
      from a JPEG source, but it means one format can serve both photographs and
      cut-outs on a site.
  - label: Chroma handling
    detail:
      Lossy WebP subsamples chroma at 4:2:0, like most JPEGs. Strongly saturated
      red or blue edges — a red logo on white — can soften slightly. Lossless
      mode avoids it entirely.
limitations:
  - This is generation two of lossy compression. Converting from the original
    source rather than from an already-compressed JPEG always gives a better
    result.
  - Some older software and a few email clients still do not render WebP, so it
    is a web delivery format rather than an archive or handoff format.
  - WebP is capped at 16383 pixels in either dimension, which very large
    panoramas and scans can exceed.
useCases:
  - Cutting the weight of an image-heavy site or blog archive without
    re-exporting every asset from its source.
  - Meeting a Core Web Vitals or page-weight budget where the images are the
    dominant cost.
  - Producing a smaller delivery set for a mobile app or a bandwidth-constrained
    deployment.
macOSAlternative:
  method: cwebp, via Homebrew
  detail:
    Google's `cwebp` encoder is the reference implementation and gives you every
    switch the format has. `cwebp -q 80 in.jpg -o out.webp` is the basic form,
    and a shell loop covers a directory. It does have to be installed, because
    macOS reads WebP but does not write it — `sips --formats` on macOS 26 lists
    `org.webmproject.webp` with no Writable flag.
  breaksDownWhen:
    You would rather not install a toolchain, want to see before-and-after sizes
    per file, or need to resize in the same pass — cwebp's resize flag exists
    but composing it with a folder walk is a script you have to write and
    maintain.
related:
  - png-to-webp
  - jpg-to-avif
  - webp-to-jpg
---

## The generational cost, stated honestly

Most pages about this conversion imply you get the size saving for free. You do
not, and the reason is worth understanding.

Your JPEG has already been through a lossy encoder. Its artefacts — the faint
blocking in flat areas, the ringing around edges — are now, as far as any other
codec is concerned, _part of the picture_. When WebP encodes it, it spends bits
faithfully reproducing those artefacts.

The practical consequences:

- Convert at a **reasonably high quality** (80–85) and the result is usually
  hard to tell apart from the source at normal viewing size, while still being
  meaningfully smaller. This is the normal case and it works well.
- Convert at a **low quality** (below 65) and the two generations compound. You
  get a file that is small and visibly worse than a single-pass encode at the
  same size would have been.
- If you still have the RAW, TIFF or PSD source, converting from that instead
  skips the problem entirely.

## Picking a quality

WebP's quality number is not JPEG's quality number. They are different encoders
with different internal models and there is no fixed conversion between them — a
rule like "WebP q equals JPEG q plus ten" is folklore, not a property of either
format.

So the useful method is not a table, it is a loop: **start at the app's default
of 80**, convert a representative handful, look at them at the size they will
actually be viewed, and read the per-row before/after figures. Move the number
and repeat if you need to. That takes a minute and is worth more than any
threshold someone else picked for a corpus that is not yours.

Two things are worth knowing before you start:

- Raise it, not lower it, when the source is a JPEG you cannot re-export — you
  are compressing something already compressed.
- **Lossless mode** is for screenshots, diagrams and flat graphics, not for
  photographs: lossless photographic WebP is typically much larger than the JPEG
  you started with, which Google's own FAQ warns about explicitly.

## Browser support is no longer the question

WebP is supported by every current browser and has been for years. Safari picked
it up in 14, which is the release everyone was waiting on.

The remaining gaps are outside browsers: some desktop software, some older email
clients, a few CMS upload validators. That makes WebP a **delivery** format.
Keep your originals in something universal, and treat the WebP set as generated
output — which is exactly how a batch converter fits into the workflow.

## Converting a directory

Point PixelFerry at your images folder. It walks subfolders, so a
`content/uploads/2024/…` tree comes in as one queue.

Set WebP, pick a quality, and — usually the bigger win — set a maximum width. A
great many sites serve 4000-pixel photographs into a 1200-pixel column. Capping
the width saves more bytes than the codec change does, and doing both in the
same pass means you only decode each file once.

Each finished row shows the before and after size with the percentage saved, so
you can see immediately whether the settings are doing what you hoped rather
than comparing folder sizes afterwards.
