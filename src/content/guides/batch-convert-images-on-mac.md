---
title: How to batch convert images on a Mac — and where each method stops
description:
  Finder Quick Actions, Preview, Automator and sips all convert images in bulk
  with nothing installed. What each one does, where each one stops, and how to
  choose.
heading: How to batch convert images on a Mac
published: 2026-08-29
updated: 2026-08-29
summary:
  macOS ships four separate ways to convert a pile of images, and most people
  know one of them. This walks through all four with their real limits, then
  covers what to do when the built-ins run out.
takeaways:
  - The Finder Quick Action converts a selection to JPEG, PNG or HEIF in two
    clicks and is the right answer for most quick jobs.
  - Preview's Export Selected Images gives you a quality slider that the Quick
    Action does not.
  - sips is the built-in that scales best to thousands of files, and the one
    that composes with a script.
  - None of the built-ins give you a readable per-file summary, which is what
    makes large mixed batches painful.
relatedConversions:
  - heic-to-jpg
  - raw-to-jpg
  - jpg-to-webp
---

macOS has had bulk image conversion built in for years, in four different
places, none of which advertise themselves. Before installing anything, it is
worth knowing exactly what you already have.

## 1. The Finder Quick Action

**Where:** select files in Finder → right-click → Quick Actions → Convert Image.

Apple added this in macOS Monterey and it is the quickest route for a small
selection. Select any number of files, right-click, choose **JPEG**, **PNG** or
**HEIF**, pick a size from Small / Medium / Large / Actual Size, and optionally
preserve metadata. New files appear beside the originals.

**What it does well:** it is two clicks, it handles HEIC and camera RAW, and it
never touches the originals.

**Where it stops:**

- Three output formats. No WebP, no AVIF, no TIFF.
- Size is four named presets, not pixel dimensions.
- No quality control at all — you get Apple's choice.
- The output lands beside the originals, which is awkward for a delivery set.
- If a file fails, you find out by counting the results.

For converting a folder of iPhone photos to JPEG, this is usually the right tool
and nothing else is needed. See [HEIC to JPG](/convert/heic-to-jpg) for what
that conversion costs.

## 2. Preview

**Where:** select files in Finder → open in Preview → select all in the sidebar
→ File → Export Selected Images.

Preview's bulk export is the one with a **quality slider**, which is the main
reason to prefer it over the Quick Action. You also get a proper destination
picker, and an Options panel for the format.

**Where it stops:**

- It degrades on large selections, because every image has to be open in the
  window at once.
- No resizing during the export itself. Tools → Adjust Size is a separate step —
  though it does work on a multi-selection: Apple documents displaying the
  images in one window, selecting them in the sidebar, then choosing Tools →
  Adjust Size.
- No WebP export. macOS has no WebP encoder — `sips --formats` lists
  `org.webmproject.webp` without the Writable flag — so no built-in offers it.

## 3. Automator (or a Shortcut)

**Where:** Automator → new Quick Action → "Change Type of Images", or the
equivalent Shortcuts action.

This is the built-in route to a **repeatable** conversion. Build a workflow
once, save it as a Quick Action, and it appears in the Finder right-click menu
for everyone on the machine. You can chain "Scale Images" in front of "Change
Type of Images" to resize and convert in one step, which neither of the previous
two options can do.

**Where it stops:**

- Add a "Copy Finder Items" step first or it converts in place and destroys the
  originals. This catches people out constantly.
- A file the workflow cannot handle stops it, and finding which one is on you.
- The image actions are old and the format list has not grown.

## 4. sips

**Where:** Terminal.

`sips` — Scriptable Image Processing System — is the command-line front end to
the same ImageIO framework everything above uses. It is the only built-in that
scales properly.

```bash
# One file
sips -s format jpeg photo.heic --out photo.jpg

# Every HEIC in the folder, at quality 85
for f in *.heic; do
  sips -s format jpeg -s formatOptions 85 "$f" --out "${f%.heic}.jpg"
done

# Convert and cap the long edge at 2000px
sips -s format jpeg -Z 2000 input.tiff --out output.jpg
```

**What it does well:** it is fast, it is scriptable, it can be scheduled, and it
handles everything ImageIO handles — including camera RAW.

**Where it stops:**

- No WebP output. `sips` does write AVIF on current macOS — `sips --formats`
  lists `public.avif` as Writable — but `org.webmproject.webp` is read-only.
- `--out` will overwrite without asking. Write to a separate directory.
- No progress, no summary, and a failure is a line of stderr somewhere in the
  scrollback.

## Choosing between them

| You want to…                             | Use                    |
| ---------------------------------------- | ---------------------- |
| Convert some photos to JPEG right now    | Finder Quick Action    |
| Control the JPEG quality                 | Preview                |
| Resize a modest set to exact pixels      | Preview (multi-select) |
| Repeat the same conversion regularly     | Automator or Shortcuts |
| Convert thousands of files, or script it | sips                   |

## Where the built-ins genuinely run out

Three situations, and they are the reason a dedicated tool exists at all.

**WebP output.** No built-in writes WebP. `sips` does write AVIF on current
macOS, so that half of the modern-format gap has closed — see
[JPG to WebP](/convert/jpg-to-webp) and [JPG to AVIF](/convert/jpg-to-avif).

**Mixed input with per-type rules.** A folder containing HEIC from phones, CR3
from a camera, PSD from a designer and a PDF of the brief. Finder and `sips`
will both take that selection in one pass — but every file gets the same
treatment, and PDF needs a different route entirely.

**Knowing what failed.** When a large batch contains a file that is truncated,
corrupt or in a format the decoder rejects, the built-ins give you fewer output
files than input files, and finding which ones are missing is on you.

PixelFerry is built for exactly that third case: one queue, mixed formats, one
set of output rules, and a per-file result you can actually read. Everything
runs on your Mac. HEIC and the macOS-only formats decode through the same local
ImageIO the built-in tools use; the rest go through a bundled image pipeline.
Originals are never modified.
