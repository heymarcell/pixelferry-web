---
title: Convert PDF pages to PNG on Mac — one image per page
description:
  Each PDF page becomes its own PNG, in a folder named after the document,
  capped at the first 100 pages. What the cap is for, and when Preview is
  enough.
heading: Convert a PDF to PNG images on a Mac
from: PDF
to: PNG
published: 2026-08-29
updated: 2026-08-29
summary:
  A PDF is a page description, not an image. Converting it rasterises each page
  into a separate PNG — useful for thumbnails, previews and embedding, and lossy
  in the sense that selectable text becomes pixels.
whatChanges:
  - label: Pages become separate files
    detail:
      A multi-page PDF exports as `name-1.png`, `name-2.png`, `name-3.png` and
      so on, into a folder named after the document — every page is numbered,
      including the first. The conversion reports how many pages it produced
      rather than leaving you to count.
  - label: Text stops being text
    detail:
      Vector glyphs are rasterised. The output is no longer searchable,
      selectable or reflowable, and it will not be picked up by a text index.
      This is the fundamental trade of the conversion.
  - label: Vectors get a fixed resolution
    detail:
      A PDF's line art is resolution-independent; a PNG is not. Once rasterised,
      zooming in shows pixels rather than sharper curves.
  - label: Interactivity is dropped
    detail:
      Links, form fields, annotations, layers and embedded attachments have no
      representation in a PNG and do not survive.
limitations:
  - Long documents are capped at the first 100 pages. Rendering is held in
    memory, and an uncapped 500-page scan would take the app down — so the
    conversion says it stopped rather than silently truncating.
  - PDF is input-only. PixelFerry does not assemble images back into a PDF.
  - Password-protected and damaged PDFs will not render, and are reported as
    errors on their own row rather than failing the batch.
useCases:
  - Producing page thumbnails of a document set for a CMS, a wiki, or an
    internal review tool.
  - Extracting scanned pages as images so they can be cropped, straightened or
    run through OCR elsewhere.
  - Getting a single page of a report into a slide deck or an email without
    attaching the whole document.
macOSAlternative:
  method: Preview's export, or sips
  detail:
    Preview can export a PDF to PNG, and in the sidebar you can select specific
    pages first. `sips -s format png doc.pdf --out page.png` handles the first
    page from Terminal.
  breaksDownWhen:
    You have several PDFs to do at once. Preview handles one document at a time,
    and there is no way to apply the same output width across a set of them.
related:
  - psd-to-png
  - tiff-to-jpg
  - heic-to-png
---

## Why the 100-page cap exists

This is a real limit and it is stated on purpose rather than discovered at run
time.

PDF rendering happens in memory: every requested page is rasterised before the
writing starts. At the 2x viewport scale PixelFerry uses — roughly 144 dpi — a
500-page scanned document is gigabytes of bitmap, and the honest outcome of
attempting it is that the application dies partway through and you get an
incomplete folder with no explanation.

So the conversion stops at **the first 100 pages** and tells you it did. A
truncated result you know about is recoverable; one you do not know about is a
bug you find weeks later.

If you need more, split the PDF first — Preview's sidebar will do it by dragging
page ranges out into new documents.

## PNG or JPG for pages?

It depends on what is on them.

**PNG** for anything that is mostly text, line art, tables or screenshots. The
lossless compression keeps glyph edges sharp, and documents of that kind
compress well because they are largely flat colour.

**JPG** for scanned photographs and image-heavy brochures, where PNG produces
much larger files for no visible benefit — scanned photographic pages are close
to worst case for lossless compression.

If the document mixes both — a report with photographic plates — PNG is the
safer default, because degraded body text is more obviously wrong than a
slightly softer photograph.

## Where the output goes

Each PDF gets its own folder, named after the document. That is deliberate: a
batch of twenty PDFs at twenty pages each would otherwise put four hundred loose
PNGs into one directory with names that collide the moment two documents both
have a page 3.

Inside, pages are numbered in order. The numbers are not zero-padded, so Finder
sorts them naturally but a plain lexicographic listing — `ls`, a glob, most
`readdir` sorts — will put `name-10.png` before `name-2.png`. Worth knowing if
you are feeding them to a script.

## Resolution

Set a width if the pages are headed somewhere specific. PixelFerry rasterises at
a fixed 2x viewport scale — roughly 144 dpi, not user-configurable — which is
still far wider than a wiki thumbnail or a slide needs, and it costs real disk
space across a hundred pages.

Resizing during the conversion rather than after it means the large intermediate
never touches your disk.
