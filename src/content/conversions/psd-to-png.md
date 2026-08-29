---
title: Convert PSD to PNG on Mac — flattened, batched, no Photoshop
description:
  A PSD is layered; a PNG is one flat image. What flattening does to hidden
  layers, effects and CMYK documents, and how to convert a folder without
  Photoshop.
heading: Convert PSD to PNG on a Mac
from: PSD
to: PNG
published: 2026-08-29
updated: 2026-08-29
summary:
  PixelFerry reads the composite that Photoshop stores inside every PSD — the
  flattened preview of the document as last saved — and writes it as a PNG. No
  Photoshop licence, no Creative Cloud, no upload.
whatChanges:
  - label: Layers collapse
    detail:
      The document becomes a single raster image. Every layer, group, mask,
      adjustment layer and blend mode is baked into the result exactly as it
      appeared when the file was last saved in Photoshop.
  - label: Visibility is frozen
    detail:
      What you get is the composite, so hidden layers stay hidden and visible
      ones stay visible. There is no way to toggle a layer after conversion,
      which means the PSD has to be saved in the state you actually want.
  - label: Editability ends
    detail:
      Text becomes pixels. Smart objects lose their source. Vector shapes are
      rasterised at the document's resolution. This is a one-way door — keep the
      PSD.
  - label: Transparency survives
    detail:
      Unlike a JPEG conversion, PNG has a real alpha channel, so a PSD with a
      transparent background stays transparent. This is usually the reason PNG
      is the right target for design work.
limitations:
  - PixelFerry flattens to the stored composite. It does not render layers
    itself, so a PSD saved without a compatibility composite has nothing useful
    to read — save with "Maximize Compatibility" on.
  - CMYK and 16-bit PSDs are not supported. The bundled decoder reads 8-bit RGB
    composites only, so keep those in Photoshop.
  - PSD and PSB are input-only. There is no route from a PNG back to a layered
    document.
useCases:
  - Handing a developer flat assets from a design file without giving them the
    layered source or a Photoshop licence.
  - Generating previews of an archive of old campaign files so you can actually
    see what is in them from Finder.
  - Turning a folder of PSD mockups into images that fit in a slide deck, a
    wiki, or a client email.
macOSAlternative:
  method: Preview
  detail:
    Preview opens PSD files and exports them to PNG, reading the same stored
    composite. It handles a multi-selection too, so for a handful of files it is
    perfectly adequate and already installed.
  breaksDownWhen:
    The folder is large, or the artboards are. Preview holds every open document
    in memory, and its export cannot cap the output dimensions of a 6000px
    artboard in the same step — so resizing becomes a second pass over files you
    have already written.
related:
  - psd-to-jpg
  - heic-to-png
  - tiff-to-jpg
---

## What is actually inside a PSD

A Photoshop document holds two quite different things: the editable structure —
layers, masks, adjustments, text, smart objects — and a **flattened composite**,
which is a plain raster image of how the whole stack renders.

Photoshop writes that composite so other software has something to show without
implementing the entire rendering model. It is what Finder previews, what
Preview displays, and what PixelFerry converts.

This is the honest description of the process, and it has a consequence worth
being explicit about: **the conversion reflects the file as it was last saved.**
If a layer was hidden at save time, it is not in the composite and no converter
can bring it back.

## Why PNG rather than JPG

For design work, almost always transparency.

A logo, an icon, a UI element or a cut-out product shot has an alpha channel,
and PNG keeps it. Converting the same file [to JPG](/convert/psd-to-jpg)
flattens that transparency onto white, which is right for a photograph on a
white page and wrong for a logo going onto a coloured background.

The second reason is edges. PNG is lossless, so the hard boundaries in
typography and vector shapes stay crisp. JPEG's DCT compression puts visible
ringing around exactly those edges, and it is most obvious on the black-on-white
text that design files are full of.

## Colour, and the CMYK case

Print-bound PSDs are often CMYK, and this is the case to avoid. The bundled
decoder reads the stored composite as 8-bit RGBA positionally — it does not
consult the document's colour mode — so a CMYK PSD is not remapped for screen,
it is misread. Convert those in Photoshop.

The same decoder handles 8-bit composites only, so a 16-bit PSD fails rather
than losing precision quietly.

Colour management does not survive this route either. The composite is handed to
the encoder as a bare pixel buffer, so the document's ICC profile is not carried
into the PNG — unlike the HEIC and camera paths, where it is preserved. If the
profile matters, export from Photoshop.

## Converting a folder

Drop the folder in. PixelFerry walks it, picks up the PSDs and PSBs, and ignores
what it cannot read.

Set PNG as the output. If the artboards are large — and design files usually are
— set a max width in the same pass rather than writing 6000-pixel PNGs you will
immediately resize somewhere else.

PSDs are the slowest thing in a typical batch, because the composite has to be
decoded before anything else can happen. The queue runs four at a time and each
row shows its own progress, so a large file does not look like a hang.
